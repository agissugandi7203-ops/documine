import { NextRequest, NextResponse } from "next/server";
import {
  normalizeEmail,
  validateEmailFormat,
  validatePasswordMatch,
  validatePasswordPolicy,
  validateUsername,
} from "@/lib/auth-validation";
import {
  checkBotSignals,
  checkRateLimit,
  getClientIp,
  isDisposableEmail,
} from "@/lib/server/security";
import {
  getOriginFromRequest,
  supabaseAdminFindUserByEmail,
  supabaseResendVerification,
  supabaseSignUp,
} from "@/lib/server/supabase-auth";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { code: "INVALID_REQUEST", message: "Invalid request payload." },
      { status: 400 }
    );
  }

  const botErr = checkBotSignals(body);
  if (botErr) {
    return NextResponse.json(
      { code: "BOT_BLOCKED", message: botErr },
      { status: 400 }
    );
  }

  const ip = getClientIp(req);
  const ipRate = checkRateLimit(`signup:ip:${ip}`, 6, 15 * 60 * 1000);
  if (!ipRate.allowed) {
    return NextResponse.json(
      {
        code: "RATE_LIMITED",
        message: `Too many registration attempts. Please try again in ${Math.ceil(
          ipRate.retryAfterSec / 60
        )} minute(s).`,
      },
      { status: 429 }
    );
  }

  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  const rawEmail = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword =
    typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  const email = normalizeEmail(rawEmail);

  const usernameErr = validateUsername(username);
  if (usernameErr) {
    return NextResponse.json(
      { code: "INVALID_USERNAME", field: "username", message: usernameErr },
      { status: 400 }
    );
  }

  const emailErr = validateEmailFormat(email);
  if (emailErr) {
    return NextResponse.json(
      { code: "INVALID_EMAIL", field: "email", message: emailErr },
      { status: 400 }
    );
  }

  if (isDisposableEmail(email)) {
    return NextResponse.json(
      {
        code: "DISPOSABLE_EMAIL",
        field: "email",
        message:
          "Disposable or temporary email addresses are not permitted. Please use a permanent email address.",
      },
      { status: 400 }
    );
  }

  const passwordErr = validatePasswordPolicy(password);
  if (passwordErr) {
    return NextResponse.json(
      { code: "WEAK_PASSWORD", field: "password", message: passwordErr },
      { status: 400 }
    );
  }

  const matchErr = validatePasswordMatch(password, confirmPassword);
  if (matchErr) {
    return NextResponse.json(
      {
        code: "PASSWORD_MISMATCH",
        field: "confirmPassword",
        message: matchErr,
      },
      { status: 400 }
    );
  }

  const origin = getOriginFromRequest(req);
  const emailRedirectTo = `${origin}/auth/callback?type=signup`;

  const existingUser = await supabaseAdminFindUserByEmail(email);
  if (existingUser) {
    const isConfirmed = Boolean(
      existingUser.email_confirmed_at || existingUser.confirmed_at
    );
    if (isConfirmed) {
      return NextResponse.json(
        {
          code: "EMAIL_EXISTS",
          field: "email",
          message:
            "An account with this email already exists. Please log in instead.",
        },
        { status: 409 }
      );
    }

    // Account exists but has not verified email yet
    await supabaseResendVerification(email, emailRedirectTo);
    return NextResponse.json(
      {
        code: "EMAIL_EXISTS_UNVERIFIED",
        field: "email",
        message:
          "This email is already registered but awaiting verification. We sent a fresh verification link to your inbox.",
      },
      { status: 409 }
    );
  }

  const result = await supabaseSignUp(email, password, username, emailRedirectTo);
  if (!result.ok) {
    const err = result.error ?? {
      status: 400,
      code: "SIGNUP_FAILED",
      message: "Unable to create account. Please try again.",
    };
    return NextResponse.json(
      { code: err.code, message: err.message },
      { status: err.status }
    );
  }

  // Supabase obfuscated duplicate check (if identities is empty array)
  const createdUser = result.data?.user ?? (result.data as unknown as { identities?: unknown[] });
  if (
    createdUser &&
    "identities" in createdUser &&
    Array.isArray(createdUser.identities) &&
    createdUser.identities.length === 0
  ) {
    return NextResponse.json(
      {
        code: "EMAIL_EXISTS",
        field: "email",
        message:
          "An account with this email already exists. Please log in instead.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json(
    {
      requiresVerification: true,
      email,
      message:
        "Account created. Please check your inbox and click the verification link before logging in.",
    },
    { status: 201 }
  );
}
