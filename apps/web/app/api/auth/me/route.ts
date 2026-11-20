import { NextRequest, NextResponse } from "next/server";
import {
  REFRESH_COOKIE,
  capSessionMetadataCookies,
  clearAuthCookies,
  resolveServerSession,
  setAuthCookies,
} from "@/lib/server/supabase-auth";

export async function GET(req: NextRequest) {
  const session = await resolveServerSession(req, {
    verifyAccessWithProvider: true,
  });

  if (session.authenticated && session.user) {
    const response = NextResponse.json({
      authenticated: true,
      user: session.user,
      expiresAt: session.accessExpEpoch ?? null,
      sessionExpiresAt: session.sessionExpEpoch ?? null,
      idleExpiresAt: session.idleExpiresAtEpoch ?? null,
    });

    if (session.refreshedSession) {
      const updated = await setAuthCookies(response, session.refreshedSession, req, {
        existingSessionExpEpoch: session.sessionExpEpoch,
      });
      if (!updated) {
        return NextResponse.json(
          {
            authenticated: false,
            user: null,
            expiresAt: null,
            sessionExpiresAt: null,
            reason: "session_expired",
          },
          { status: 200, headers: response.headers }
        );
      }
    } else if (session.persistLegacyCap && session.sessionExpEpoch) {
      await capSessionMetadataCookies(
        response,
        req,
        session.sessionExpEpoch,
        req.cookies.get(REFRESH_COOKIE)?.value
      );
    }

    return response;
  }

  const unauth = NextResponse.json(
    {
      authenticated: false,
      user: null,
      expiresAt: null,
      sessionExpiresAt: null,
      reason: session.failureReason ?? "missing_session",
    },
    { status: 200 }
  );
  if (session.shouldClearCookies) {
    clearAuthCookies(unauth, req);
  }
  return unauth;
}
