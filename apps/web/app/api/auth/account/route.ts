import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  supabaseGetUser,
  supabaseRefreshSession,
} from "@/lib/server/supabase-auth";
import {
  checkRateLimit,
  getClientIp,
  validateSameOrigin,
} from "@/lib/server/security";

const FASTAPI_URL = (
  process.env.FASTAPI_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000"
).replace(/\/+$/, "");

export async function DELETE(req: NextRequest) {
  const csrfError = validateSameOrigin(req);
  if (csrfError) return csrfError;

  const ip = getClientIp(req);
  const rate = checkRateLimit(`delete-account:ip:${ip}`, 5, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        code: "RATE_LIMITED",
        detail: `Too many requests. Please wait ${rate.retryAfterSec} seconds.`,
      },
      { status: 429 }
    );
  }

  let accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  if (accessToken) {
    const check = await supabaseGetUser(accessToken);
    if (!check.ok) {
      accessToken = undefined;
    }
  }

  if (!accessToken && refreshToken) {
    const refreshed = await supabaseRefreshSession(refreshToken);
    if (refreshed.ok && refreshed.data?.access_token) {
      accessToken = refreshed.data.access_token;
    }
  }

  if (!accessToken) {
    return NextResponse.json(
      { detail: "Authentication required." },
      { status: 401 }
    );
  }

  try {
    const upstream = await fetch(`${FASTAPI_URL}/api/auth/account`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const payload = await upstream.json().catch(() => ({
      status: "account_deleted",
    }));

    const res = NextResponse.json(payload, { status: upstream.status });
    if (upstream.ok) {
      clearAuthCookies(res, req);
    }
    return res;
  } catch {
    return NextResponse.json(
      { detail: "Backend API is currently unreachable." },
      { status: 502 }
    );
  }
}
