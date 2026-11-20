import { NextRequest, NextResponse } from "next/server";
import {
  clearAuthCookies,
  resolveServerSession,
  setAuthCookies,
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

  const session = await resolveServerSession(req, {
    verifyAccessWithProvider: true,
  });

  if (!session.authenticated || !session.accessToken) {
    const expired = NextResponse.json(
      { detail: "Authentication required." },
      { status: 401 }
    );
    clearAuthCookies(expired, req);
    return expired;
  }

  try {
    const upstream = await fetch(`${FASTAPI_URL}/api/auth/account`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: "no-store",
    });

    const payload = await upstream.json().catch(() => ({
      status: "account_deleted",
    }));

    const res = NextResponse.json(payload, { status: upstream.status });
    if (upstream.ok) {
      clearAuthCookies(res, req);
    } else if (session.refreshedSession) {
      await setAuthCookies(res, session.refreshedSession, req, {
        existingSessionExpEpoch: session.sessionExpEpoch,
      });
    }
    return res;
  } catch {
    return NextResponse.json(
      { detail: "Backend API is currently unreachable." },
      { status: 502 }
    );
  }
}
