import { NextRequest, NextResponse } from "next/server";
import { normalizeEmail, validateEmailFormat } from "@/lib/auth-validation";
import { checkRateLimit, getClientIp } from "@/lib/server/security";
import {
  getOriginFromRequest,
  supabaseResendVerification,
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

  const rawEmail = typeof body.email === "string" ? body.email : "";
  const email = normalizeEmail(rawEmail);
  const emailErr = validateEmailFormat(email);
  if (emailErr) {
    return NextResponse.json(
      { code: "INVALID_EMAIL", message: emailErr },
      { status: 400 }
    );
  }

  const ip = getClientIp(req);
  const ipRate = checkRateLimit(`resend:ip:${ip}`, 4, 10 * 60 * 1000);
  const emailRate = checkRateLimit(`resend:email:${email}`, 3, 10 * 60 * 1000);
  if (!ipRate.allowed || !emailRate.allowed) {
    const waitSec = Math.max(ipRate.retryAfterSec, emailRate.retryAfterSec);
    return NextResponse.json(
      {
        code: "RATE_LIMITED",
        message: `Please wait ${waitSec} seconds before requesting another verification email.`,
      },
      { status: 429 }
    );
  }

  const origin = getOriginFromRequest(req);
  const result = await supabaseResendVerification(
    email,
    `${origin}/auth/callback?type=signup`
  );

  if (!result.ok && result.error?.status === 429) {
    return NextResponse.json(
      { code: result.error.code, message: result.error.message },
      { status: 429 }
    );
  }

  // Neutral response to avoid leaking whether email is registered/confirmed
  return NextResponse.json({
    sent: true,
    message:
      "If that account is pending verification, a verification email has been sent to your inbox.",
  });
}
