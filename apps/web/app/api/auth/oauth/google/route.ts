import { NextRequest, NextResponse } from "next/server";
import {
  PKCE_COOKIE,
  buildGoogleOAuthUrl,
  createPkcePair,
  getOriginFromRequest,
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
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
  });
  return response;
}
