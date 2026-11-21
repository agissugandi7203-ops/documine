import { NextRequest, NextResponse } from "next/server";
import {
  REFRESH_COOKIE,
  capSessionMetadataCookies,
  clearAuthCookies,
  resolveServerSession,
  setAuthCookies,
} from "@/lib/server/supabase-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function resolveFastApiBaseUrl(): string {
  const raw = (
    process.env.FASTAPI_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000"
  ).trim();
  const withProto = /^https?:\/\//i.test(raw)
    ? raw
    : raw.startsWith("localhost") || raw.startsWith("127.0.0.1")
    ? `http://${raw}`
    : `https://${raw}`;
  return withProto.replace(/\/+$/, "").replace(/\/api$/i, "");
}

const FASTAPI_URL = resolveFastApiBaseUrl();

async function handleProxy(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  let session = await resolveServerSession(req, {
    verifyAccessWithProvider: false,
  });

  if (!session.authenticated || !session.accessToken) {
    const unauth = NextResponse.json(
      { detail: "Authentication required or session expired." },
      { status: 401 }
    );
    clearAuthCookies(unauth, req);
    return unauth;
  }

  let activeAccessToken = session.accessToken;
  const targetPath = path.map((seg) => encodeURIComponent(seg)).join("/");
  const targetUrl = `${FASTAPI_URL}/api/${targetPath}${req.nextUrl.search}`;

  const rawBody =
    req.method !== "GET" && req.method !== "HEAD"
      ? await req.arrayBuffer()
      : undefined;

  const buildUpstreamInit = (token: string): RequestInit => {
    const headers = new Headers();
    const contentType = req.headers.get("content-type");
    if (contentType) {
      headers.set("content-type", contentType);
    }
    const acceptHeader = req.headers.get("accept");
    if (acceptHeader) {
      headers.set("accept", acceptHeader);
    }
    const workspaceHeader = req.headers.get("x-workspace-id");
    if (workspaceHeader) {
      headers.set("x-workspace-id", workspaceHeader);
    }
    headers.set("authorization", `Bearer ${token}`);
    return {
      method: req.method,
      headers,
      body: rawBody,
      cache: "no-store",
    };
  };

  try {
    let upstream = await fetch(targetUrl, buildUpstreamInit(activeAccessToken));

    // If upstream FastAPI rejected the token (e.g., revoked before exp) and we haven't refreshed yet, force one refresh + retry
    if (upstream.status === 401 && !session.refreshedSession) {
      const forced = await resolveServerSession(req, {
        forceRefresh: true,
        verifyAccessWithProvider: false,
      });
      if (forced.authenticated && forced.accessToken) {
        session = forced;
        activeAccessToken = forced.accessToken;
        upstream = await fetch(targetUrl, buildUpstreamInit(activeAccessToken));
      } else {
        const expired = NextResponse.json(
          { detail: "Session expired. Please sign in again." },
          { status: 401 }
        );
        clearAuthCookies(expired, req);
        return expired;
      }
    }

    const applySessionCookies = async (res: NextResponse) => {
      if (upstream.status === 401) {
        clearAuthCookies(res, req);
        return;
      }
      if (session.refreshedSession) {
        await setAuthCookies(res, session.refreshedSession, req, {
          existingSessionExpEpoch: session.sessionExpEpoch,
        });
      } else if (session.persistLegacyCap && session.sessionExpEpoch) {
        await capSessionMetadataCookies(
          res,
          req,
          session.sessionExpEpoch,
          req.cookies.get(REFRESH_COOKIE)?.value
        );
      }
    };

    const outHeaders = new Headers();
    const upstreamType = upstream.headers.get("content-type") || "";
    if (upstreamType) {
      outHeaders.set("content-type", upstreamType);
    }
    const upstreamDisposition = upstream.headers.get("content-disposition");
    if (upstreamDisposition) {
      outHeaders.set("content-disposition", upstreamDisposition);
    }
    const upstreamLength = upstream.headers.get("content-length");
    if (upstreamLength) {
      outHeaders.set("content-length", upstreamLength);
    }

    // Pass-through SSE streams without buffering into an ArrayBuffer
    if (upstreamType.includes("text/event-stream") && upstream.body) {
      outHeaders.set("content-type", "text/event-stream; charset=utf-8");
      outHeaders.set("cache-control", "no-cache, no-transform");
      outHeaders.set("connection", "keep-alive");
      outHeaders.set("x-accel-buffering", "no");
      const streamRes = new NextResponse(upstream.body, {
        status: upstream.status,
        headers: outHeaders,
      });
      await applySessionCookies(streamRes);
      return streamRes;
    }

    const body = await upstream.arrayBuffer();
    const res = new NextResponse(body, {
      status: upstream.status,
      headers: outHeaders,
    });
    await applySessionCookies(res);
    return res;
  } catch (err) {
    console.error("[Proxy Upstream Error]", targetPath, err);
    return NextResponse.json(
      { detail: "Service connection is temporarily busy. Please try again in a moment." },
      { status: 502 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
