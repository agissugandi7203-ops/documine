import { NextRequest, NextResponse } from "next/server";
import {
  PKCE_COOKIE,
  PKCE_TOKEN_TTL_SEC,
  buildGoogleOAuthUrl,
  createPkcePair,
  getOriginFromRequest,
  isSecureRequest,
} from "@/lib/server/supabase-auth";

export async function GET(req: NextRequest) {
  const origin = getOriginFromRequest(req);
  const redirectTo = `${origin}/auth/callback`;
  const { verifier, challenge } = await createPkcePair();
  const authorizeUrl = buildGoogleOAuthUrl(redirectTo, challenge);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(PKCE_COOKIE, verifier, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isSecureRequest(req),
    maxAge: PKCE_TOKEN_TTL_SEC,
    expires: new Date(Date.now() + PKCE_TOKEN_TTL_SEC * 1000),
  });
  return response;
}
