import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  sanitizeUser,
  setAuthCookies,
  supabaseGetUser,
  supabaseRefreshSession,
} from "@/lib/server/supabase-auth";

export async function GET(req: NextRequest) {
  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  if (accessToken) {
    const userRes = await supabaseGetUser(accessToken);
    if (userRes.ok && userRes.data) {
      const safeUser = sanitizeUser(userRes.data);
      if (safeUser.emailVerified) {
        return NextResponse.json({
          authenticated: true,
          user: safeUser,
        });
      }
    }
  }

  if (refreshToken) {
    const refreshRes = await supabaseRefreshSession(refreshToken);
    if (refreshRes.ok && refreshRes.data?.access_token && refreshRes.data.user) {
      const safeUser = sanitizeUser(refreshRes.data.user);
      if (safeUser.emailVerified) {
        const response = NextResponse.json({
          authenticated: true,
          user: safeUser,
        });
        setAuthCookies(response, refreshRes.data, req);
        return response;
      }
    }
  }

  const unauth = NextResponse.json(
    { authenticated: false, user: null },
    { status: 200 }
  );
  if (accessToken || refreshToken) {
    clearAuthCookies(unauth, req);
  }
  return unauth;
}
