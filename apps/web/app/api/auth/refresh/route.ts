import { NextRequest, NextResponse } from "next/server";
import { validateSameOrigin } from "@/lib/server/security";
import {
  REFRESH_COOKIE,
  capSessionMetadataCookies,
  clearAuthCookies,
  resolveServerSession,
  setAuthCookies,
} from "@/lib/server/supabase-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const csrfError = validateSameOrigin(req);
  if (csrfError) return csrfError;

  let forceRefresh = false;
  try {
    const body = (await req.json()) as { force?: boolean } | null;
    forceRefresh = Boolean(body?.force);
  } catch {
    forceRefresh = false;
  }

  const session = await resolveServerSession(req, {
    forceRefresh,
    minFreshSeconds: 180,
    verifyAccessWithProvider: false,
  });

  if (!session.authenticated || !session.accessToken) {
    const expiredRes = NextResponse.json(
      {
        authenticated: false,
        refreshed: false,
        code: "SESSION_EXPIRED",
        message: "Your session has expired. Please log in again.",
      },
      { status: 401 }
    );
    clearAuthCookies(expiredRes, req);
    return expiredRes;
  }

  const res = NextResponse.json({
    authenticated: true,
    refreshed: Boolean(session.refreshedSession),
    expiresAt: session.accessExpEpoch ?? null,
    sessionExpiresAt: session.sessionExpEpoch ?? null,
    idleExpiresAt: session.idleExpiresAtEpoch ?? null,
  });

  if (session.refreshedSession) {
    const cookieMeta = await setAuthCookies(res, session.refreshedSession, req, {
      existingSessionExpEpoch: session.sessionExpEpoch,
    });
    if (!cookieMeta) {
      const expiredRes = NextResponse.json(
        {
          authenticated: false,
          refreshed: false,
          code: "SESSION_EXPIRED",
          message: "Your session has expired. Please log in again.",
        },
        { status: 401 }
      );
      clearAuthCookies(expiredRes, req);
      return expiredRes;
    }
  } else if (session.persistLegacyCap && session.sessionExpEpoch) {
    await capSessionMetadataCookies(
      res,
      req,
      session.sessionExpEpoch,
      req.cookies.get(REFRESH_COOKIE)?.value
    );
  }

  return res;
}
