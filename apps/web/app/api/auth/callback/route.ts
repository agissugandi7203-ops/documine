import { NextRequest, NextResponse } from "next/server";
import {
  PKCE_COOKIE,
  isSecureRequest,
  sanitizeUser,
  setAuthCookies,
  setRecoveryCookie,
  supabaseExchangePkce,
  supabaseGetUser,
  supabaseVerifyOtp,
  type SupabaseSessionPayload,
} from "@/lib/server/supabase-auth";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { code: "INVALID_REQUEST", message: "Invalid callback payload." },
      { status: 400 }
    );
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  const tokenHash =
    typeof body.tokenHash === "string" ? body.tokenHash.trim() : "";
  const rawType = typeof body.type === "string" ? body.type.trim() : "";
  const accessToken =
    typeof body.accessToken === "string" ? body.accessToken.trim() : "";
  const refreshToken =
    typeof body.refreshToken === "string" ? body.refreshToken.trim() : "";
  const expiresIn =
    typeof body.expiresIn === "number" && Number.isFinite(body.expiresIn)
      ? body.expiresIn
      : 3600;

  let session: Partial<SupabaseSessionPayload> | null = null;

  if (code) {
    const verifier = req.cookies.get(PKCE_COOKIE)?.value;
    if (!verifier) {
      return NextResponse.json(
        {
          code: "PKCE_MISSING",
          message:
            "Authentication session expired or opened in a different browser. Please try again.",
        },
        { status: 400 }
      );
    }
    const exchangeRes = await supabaseExchangePkce(code, verifier);
    if (!exchangeRes.ok || !exchangeRes.data?.access_token) {
      const err = exchangeRes.error ?? {
        status: 400,
        code: "CALLBACK_FAILED",
        message: "Verification link is invalid or has expired.",
      };
      return NextResponse.json(
        { code: err.code, message: err.message },
        { status: err.status }
      );
    }
    session = exchangeRes.data;
  } else if (tokenHash) {
    const allowedTypes = [
      "signup",
      "recovery",
      "email",
      "invite",
      "magiclink",
    ] as const;
    const otpType = allowedTypes.includes(
      rawType as (typeof allowedTypes)[number]
    )
      ? (rawType as (typeof allowedTypes)[number])
      : "signup";
    const verifyRes = await supabaseVerifyOtp(tokenHash, otpType);
    if (!verifyRes.ok || !verifyRes.data?.access_token) {
      const err = verifyRes.error ?? {
        status: 400,
        code: "TOKEN_EXPIRED",
        message: "This verification link is invalid or has expired.",
      };
      return NextResponse.json(
        { code: err.code, message: err.message },
        { status: err.status }
      );
    }
    session = verifyRes.data;
  } else if (accessToken) {
    const userRes = await supabaseGetUser(accessToken);
    if (!userRes.ok || !userRes.data) {
      return NextResponse.json(
        {
          code: "TOKEN_EXPIRED",
          message: "This verification link is invalid or has expired.",
        },
        { status: 401 }
      );
    }
    session = {
      access_token: accessToken,
      refresh_token: refreshToken || undefined,
      expires_in: expiresIn,
      user: userRes.data,
    };
  } else {
    return NextResponse.json(
      {
        code: "MISSING_TOKEN",
        message: "No verification token was provided. Please try logging in.",
      },
      { status: 400 }
    );
  }

  if (!session?.access_token || !session.user) {
    return NextResponse.json(
      {
        code: "CALLBACK_FAILED",
        message: "Authentication could not be verified.",
      },
      { status: 400 }
    );
  }

  if (rawType === "recovery") {
    const response = NextResponse.json({
      verified: true,
      flowType: "recovery",
      redirectTo: "/reset-password",
    });
    setRecoveryCookie(response, session.access_token, req);
    return response;
  }

  const safeUser = sanitizeUser(session.user);
  const response = NextResponse.json({
    verified: true,
    flowType: rawType || "auth",
    user: safeUser,
    redirectTo: "/dashboard",
  });

  const cookieMeta = await setAuthCookies(
    response,
    {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
    },
    req
  );
  response.cookies.set(PKCE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isSecureRequest(req),
    maxAge: 0,
    expires: new Date(0),
  });
  if (!cookieMeta) {
    return NextResponse.json(
      {
        code: "TOKEN_EXPIRED",
        message: "Verification token expired or missing expiry. Please sign in again.",
      },
      { status: 401, headers: response.headers }
    );
  }
  return response;
}
