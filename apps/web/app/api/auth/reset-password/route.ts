import { NextRequest, NextResponse } from "next/server";
import {
  validatePasswordMatch,
  validatePasswordPolicy,
} from "@/lib/auth-validation";
import { checkRateLimit, getClientIp } from "@/lib/server/security";
import {
  ACCESS_COOKIE,
  RECOVERY_COOKIE,
  clearAuthCookies,
  supabaseSignOut,
  supabaseUpdatePassword,
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

  const ip = getClientIp(req);
  const ipRate = checkRateLimit(`reset:ip:${ip}`, 6, 15 * 60 * 1000);
  if (!ipRate.allowed) {
    return NextResponse.json(
      {
        code: "RATE_LIMITED",
        message: "Too many password reset attempts. Please wait a few minutes and try again.",
      },
      { status: 429 }
    );
  }

  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword =
    typeof body.confirmPassword === "string" ? body.confirmPassword : "";

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

  const recoveryToken =
    req.cookies.get(RECOVERY_COOKIE)?.value ||
    req.cookies.get(ACCESS_COOKIE)?.value;

  if (!recoveryToken) {
    return NextResponse.json(
      {
        code: "TOKEN_EXPIRED",
        message:
          "Your password reset session is missing or has expired. Please request a new reset link.",
      },
      { status: 401 }
    );
  }

  const updateRes = await supabaseUpdatePassword(recoveryToken, password);
  if (!updateRes.ok) {
    const err = updateRes.error ?? {
      status: 400,
      code: "RESET_FAILED",
      message:
        "Could not update password. Your reset link may have expired; please request a new one.",
    };
    return NextResponse.json(
      { code: err.code, message: err.message },
      { status: err.status }
    );
  }

  // Revoke the recovery session and clear cookies so user signs in fresh with new password
  await supabaseSignOut(recoveryToken).catch(() => {});

  const response = NextResponse.json({
    updated: true,
    message:
      "Your password has been updated successfully. Please log in with your new password.",
  });
  clearAuthCookies(response, req);
  return response;
}
