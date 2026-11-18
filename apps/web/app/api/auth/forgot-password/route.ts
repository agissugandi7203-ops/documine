import { NextRequest, NextResponse } from "next/server";
import { normalizeEmail, validateEmailFormat } from "@/lib/auth-validation";
import {
  checkBotSignals,
  checkRateLimit,
  getClientIp,
} from "@/lib/server/security";
import {
  getOriginFromRequest,
  supabaseRecoverPassword,
} from "@/lib/server/supabase-auth";

const NEUTRAL_RESET_MESSAGE =
  "If an account exists for that email address, we have sent password reset instructions. Please check your inbox.";

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
  const ipRate = checkRateLimit(`forgot:ip:${ip}`, 5, 10 * 60 * 1000);
  const emailRate = checkRateLimit(`forgot:email:${email}`, 3, 10 * 60 * 1000);
  if (!ipRate.allowed || !emailRate.allowed) {
    return NextResponse.json(
      {
        code: "RATE_LIMITED",
        message: "Too many reset requests. Please wait a few minutes and try again.",
      },
      { status: 429 }
    );
  }

  const origin = getOriginFromRequest(req);
  const result = await supabaseRecoverPassword(
    email,
    `${origin}/reset-password`
  );

  // Only surface rate limit errors; otherwise always return a neutral response to prevent account enumeration
  if (!result.ok && result.error?.status === 429) {
    return NextResponse.json(
      { code: "RATE_LIMITED", message: result.error.message },
      { status: 429 }
    );
  }

  return NextResponse.json({
    sent: true,
    message: NEUTRAL_RESET_MESSAGE,
  });
}
