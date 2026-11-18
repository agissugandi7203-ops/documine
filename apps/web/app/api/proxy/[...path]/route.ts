import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  setAuthCookies,
  supabaseGetUser,
  supabaseRefreshSession,
} from "@/lib/server/supabase-auth";

const FASTAPI_URL = (
  process.env.FASTAPI_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000"
).replace(/\/+$/, "");

async function handleProxy(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  let accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  let refreshedSession:
    | { access_token: string; refresh_token?: string; expires_in?: number }
    | null = null;

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
      refreshedSession = refreshed.data;
    }
  }

  if (!accessToken) {
    return NextResponse.json(
      { detail: "Authentication required." },
      { status: 401 }
    );
  }

  const targetPath = path.map((seg) => encodeURIComponent(seg)).join("/");
  const targetUrl = `${FASTAPI_URL}/api/${targetPath}${req.nextUrl.search}`;

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  const workspaceHeader = req.headers.get("x-workspace-id");
  if (workspaceHeader) {
    headers.set("x-workspace-id", workspaceHeader);
  }
  headers.set("authorization", `Bearer ${accessToken}`);

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  try {
    const upstream = await fetch(targetUrl, init);
    const outHeaders = new Headers();
    const upstreamType = upstream.headers.get("content-type") || "";
    if (upstreamType) {
      outHeaders.set("content-type", upstreamType);
    }

    // Pass-through SSE streams without buffering into an ArrayBuffer
    if (upstreamType.includes("text/event-stream") && upstream.body) {
      outHeaders.set("cache-control", "no-cache, no-transform");
      outHeaders.set("connection", "keep-alive");
      const streamRes = new NextResponse(upstream.body, {
        status: upstream.status,
        headers: outHeaders,
      });
      if (refreshedSession) {
        setAuthCookies(streamRes, refreshedSession, req);
      }
      return streamRes;
    }

    const body = await upstream.arrayBuffer();
    const res = new NextResponse(body, {
      status: upstream.status,
      headers: outHeaders,
    });
    if (refreshedSession) {
      setAuthCookies(res, refreshedSession, req);
    }
    return res;
  } catch {
    return NextResponse.json(
      { detail: "Backend API is currently unreachable." },
      { status: 502 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
