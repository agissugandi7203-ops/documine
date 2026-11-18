import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  PKCE_COOKIE,
  RECOVERY_COOKIE,
  setRecoveryCookie,
  supabaseExchangePkce,
  supabaseGetUser,
  supabaseVerifyOtp,
} from "@/lib/server/supabase-auth";

export async function GET(req: NextRequest) {
  const token =
    req.cookies.get(RECOVERY_COOKIE)?.value ||
    req.cookies.get(ACCESS_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      {
        valid: false,
        code: "MISSING_RECOVERY_SESSION",
        message: "This password reset link is invalid or has expired. Please request a new one.",
      },
      { status: 401 }
    );
  }

  const userRes = await supabaseGetUser(token);
  if (!userRes.ok || !userRes.data) {
    return NextResponse.json(
      {
        valid: false,
        code: "TOKEN_EXPIRED",
        message: "This password reset link is invalid or has expired. Please request a new one.",
      },
      { status: 401 }
    );
  }

  return NextResponse.json({ valid: true });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { valid: false, code: "INVALID_REQUEST", message: "Invalid request." },
      { status: 400 }
    );
  }

  const accessToken =
    typeof body.accessToken === "string" ? body.accessToken.trim() : "";
  const tokenHash =
    typeof body.tokenHash === "string" ? body.tokenHash.trim() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";

  let verifiedAccessToken: string | null = null;

  if (accessToken) {
    const userRes = await supabaseGetUser(accessToken);
    if (userRes.ok && userRes.data) {
      verifiedAccessToken = accessToken;
    }
  } else if (tokenHash) {
    const verifyRes = await supabaseVerifyOtp(tokenHash, "recovery");
    if (verifyRes.ok && verifyRes.data?.access_token) {
      verifiedAccessToken = verifyRes.data.access_token;
    }
  } else if (code) {
    const verifier = req.cookies.get(PKCE_COOKIE)?.value;
    if (verifier) {
      const pkceRes = await supabaseExchangePkce(code, verifier);
      if (pkceRes.ok && pkceRes.data?.access_token) {
        verifiedAccessToken = pkceRes.data.access_token;
      }
    }
  } else {
    const existing =
      req.cookies.get(RECOVERY_COOKIE)?.value ||
      req.cookies.get(ACCESS_COOKIE)?.value;
    if (existing) {
      const userRes = await supabaseGetUser(existing);
      if (userRes.ok && userRes.data) {
        verifiedAccessToken = existing;
      }
    }
  }

  if (!verifiedAccessToken) {
    return NextResponse.json(
      {
        valid: false,
        code: "TOKEN_EXPIRED",
        message:
          "This password reset link is invalid or has expired. Please request a new one.",
      },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ valid: true });
  setRecoveryCookie(response, verifiedAccessToken, req);
  return response;
}
