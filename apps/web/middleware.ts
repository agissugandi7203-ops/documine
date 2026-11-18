import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  PKCE_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  sanitizeUser,
  setAuthCookies,
  setRecoveryCookie,
  supabaseExchangePkce,
  supabaseGetUser,
  supabaseRefreshSession,
  supabaseVerifyOtp,
} from "@/lib/server/supabase-auth";
import { sanitizeRedirectPath } from "@/lib/auth-validation";

const PROTECTED_PREFIXES = ["/dashboard"];
const GUEST_ONLY_PATHS = ["/login", "/signup", "/forgot-password"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

async function resolveSession(req: NextRequest): Promise<{
  authenticated: boolean;
  refreshedSession?: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
  hadStaleCookies: boolean;
}> {
  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  const hadStaleCookies = Boolean(accessToken || refreshToken);

  if (accessToken) {
    const userRes = await supabaseGetUser(accessToken);
    if (userRes.ok && userRes.data) {
      const safe = sanitizeUser(userRes.data);
      if (safe.emailVerified) {
        return { authenticated: true, hadStaleCookies };
      }
    }
  }

  if (refreshToken) {
    const refreshRes = await supabaseRefreshSession(refreshToken);
    if (refreshRes.ok && refreshRes.data?.access_token && refreshRes.data.user) {
      const safe = sanitizeUser(refreshRes.data.user);
      if (safe.emailVerified) {
        return {
          authenticated: true,
          refreshedSession: refreshRes.data,
          hadStaleCookies,
        };
      }
    }
  }

  return { authenticated: false, hadStaleCookies };
}

async function handleAuthCallback(req: NextRequest): Promise<NextResponse | null> {
  const { searchParams } = req.nextUrl;
  const authError =
    searchParams.get("error_description") || searchParams.get("error");
  const code = searchParams.get("code")?.trim();
  const tokenHash = searchParams.get("token_hash")?.trim();
  const rawType = searchParams.get("type")?.trim() || "";

  if (authError) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set(
      "error",
      "Authentication could not be completed. Please try again."
    );
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const verifier = req.cookies.get(PKCE_COOKIE)?.value;
    if (!verifier) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set(
        "error",
        "Authentication session expired. Please try again."
      );
      return NextResponse.redirect(loginUrl);
    }

    const exchangeRes = await supabaseExchangePkce(code, verifier);
    if (!exchangeRes.ok || !exchangeRes.data?.access_token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set(
        "error",
        "Verification link is invalid or has expired. Please try again."
      );
      const res = NextResponse.redirect(loginUrl);
      res.cookies.set(PKCE_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return res;
    }

    const dashboardUrl = new URL("/dashboard", req.url);
    const res = NextResponse.redirect(dashboardUrl);
    setAuthCookies(res, exchangeRes.data, req);
    res.cookies.set(PKCE_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return res;
  }

  if (tokenHash) {
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
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set(
        "error",
        "This verification link is invalid or has expired. Please try again."
      );
      return NextResponse.redirect(loginUrl);
    }

    if (otpType === "recovery") {
      const res = NextResponse.redirect(new URL("/reset-password", req.url));
      setRecoveryCookie(res, verifyRes.data.access_token, req);
      return res;
    }

    const res = NextResponse.redirect(new URL("/dashboard", req.url));
    setAuthCookies(res, verifyRes.data, req);
    return res;
  }

  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname === "/auth/callback") {
    const callbackResponse = await handleAuthCallback(req);
    if (callbackResponse) {
      return callbackResponse;
    }
    return NextResponse.next();
  }

  const isProtected = matchesPrefix(pathname, PROTECTED_PREFIXES);
  const isGuestOnly = matchesPrefix(pathname, GUEST_ONLY_PATHS);

  if (!isProtected && !isGuestOnly) {
    return NextResponse.next();
  }

  // Fast-path for unauthenticated visitors to guest pages with no auth cookies
  if (
    isGuestOnly &&
    !req.cookies.get(ACCESS_COOKIE)?.value &&
    !req.cookies.get(REFRESH_COOKIE)?.value
  ) {
    return NextResponse.next();
  }

  const session = await resolveSession(req);

  if (isProtected && !session.authenticated) {
    const loginUrl = new URL("/login", req.url);
    const target = sanitizeRedirectPath(`${pathname}${search}`, "/dashboard");
    if (target !== "/dashboard") {
      loginUrl.searchParams.set("redirect", target);
    }
    const res = NextResponse.redirect(loginUrl);
    if (session.hadStaleCookies) {
      clearAuthCookies(res, req);
    }
    return res;
  }

  if (isGuestOnly && session.authenticated) {
    const redirectParam = req.nextUrl.searchParams.get("redirect");
    const destination = sanitizeRedirectPath(redirectParam, "/dashboard");
    const res = NextResponse.redirect(new URL(destination, req.url));
    if (session.refreshedSession) {
      setAuthCookies(res, session.refreshedSession, req);
    }
    return res;
  }

  const res = NextResponse.next();
  if (session.refreshedSession) {
    setAuthCookies(res, session.refreshedSession, req);
  } else if (!session.authenticated && session.hadStaleCookies) {
    clearAuthCookies(res, req);
  }
  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/auth/callback",
    "/login",
    "/signup",
    "/forgot-password",
  ],
};
