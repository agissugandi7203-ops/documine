import { NextRequest, NextResponse } from "next/server";
import {
  normalizeEmail,
  validateEmailFormat,
} from "@/lib/auth-validation";
import {
  checkBotSignals,
  checkLoginLockout,
  checkRateLimit,
  clearLoginFailures,
  getClientIp,
  recordFailedLogin,
} from "@/lib/server/security";
import {
  sanitizeUser,
  setAuthCookies,
  supabaseSignInWithPassword,
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

  const botErr = checkBotSignals({ website: body.website });
  if (botErr) {
    return NextResponse.json(
      { code: "BOT_BLOCKED", message: botErr },
      { status: 400 }
    );
  }

  const rawEmail = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  const email = normalizeEmail(rawEmail);

  const emailErr = validateEmailFormat(email);
  if (emailErr) {
    return NextResponse.json(
      { code: "INVALID_EMAIL", message: emailErr },
      { status: 400 }
    );
  }

  if (!password) {
    return NextResponse.json(
      { code: "PASSWORD_REQUIRED", message: "Password is required." },
      { status: 400 }
    );
  }

  const ip = getClientIp(req);
  const ipRate = checkRateLimit(`login:ip:${ip}`, 15, 5 * 60 * 1000);
  if (!ipRate.allowed) {
    return NextResponse.json(
      {
        code: "RATE_LIMITED",
        message: `Too many login attempts. Please wait ${ipRate.retryAfterSec} seconds and try again.`,
      },
      { status: 429 }
    );
  }

  const lockKey = `${ip}:${email}`;
  const lockStatus = checkLoginLockout(lockKey);
  if (lockStatus.locked) {
    const mins = Math.max(1, Math.ceil(lockStatus.retryAfterSec / 60));
    return NextResponse.json(
      {
        code: "ACCOUNT_TEMPORARILY_LOCKED",
        message: `Too many unsuccessful login attempts. Please wait about ${mins} minute(s) or reset your password.`,
      },
      { status: 429 }
    );
  }

  const result = await supabaseSignInWithPassword(email, password);
  if (!result.ok || !result.data?.access_token || !result.data.user) {
    const err = result.error ?? {
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password. Please check your credentials and try again.",
    };

    if (err.code === "INVALID_CREDENTIALS") {
      recordFailedLogin(lockKey);
    }

    return NextResponse.json(
      { code: err.code, message: err.message },
      { status: err.status }
    );
  }

  const safeUser = sanitizeUser(result.data.user);
  if (!safeUser.emailVerified) {
    return NextResponse.json(
      {
        code: "EMAIL_NOT_VERIFIED",
        message:
          "Your email address has not been verified yet. Please check your inbox or resend the verification link.",
      },
      { status: 403 }
    );
  }

  clearLoginFailures(lockKey);

  const response = NextResponse.json({
    authenticated: true,
    user: safeUser,
  });

  const cookieMeta = await setAuthCookies(response, result.data, req);
  if (!cookieMeta) {
    return NextResponse.json(
      {
        code: "TOKEN_EXPIRED",
        message: "Received an expired or invalid session token. Please try again.",
      },
      { status: 401, headers: response.headers }
    );
  }
  return response;
}
