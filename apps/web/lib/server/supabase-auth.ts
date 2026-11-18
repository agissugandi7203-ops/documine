import { NextRequest, NextResponse } from "next/server";
import { mapProviderAuthError, type SafeAuthError } from "./security";

export const ACCESS_COOKIE = "sb_access_token";
export const REFRESH_COOKIE = "sb_refresh_token";
export const RECOVERY_COOKIE = "sb_recovery_token";
export const PKCE_COOKIE = "sb_pkce_verifier";

export interface SupabaseUserPayload {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

export interface SupabaseSessionPayload {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type?: string;
  user: SupabaseUserPayload;
}

export interface SafeUser {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  avatarUrl?: string | null;
}

function getSupabaseConfig(): { url: string; apiKey: string } {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).replace(/\/+$/, "");
  const apiKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!url || !apiKey) {
    throw new Error("Supabase server configuration is missing.");
  }
  return { url, apiKey };
}

export function getPublicSupabaseUrl(): string {
  return (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).replace(/\/+$/, "");
}

export function sanitizeUser(user: SupabaseUserPayload): SafeUser {
  const meta = user.user_metadata || {};
  const email = user.email || "";
  const rawName =
    (typeof meta.username === "string" && meta.username) ||
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    email.split("@")[0] ||
    "User";

  const rawAvatar =
    (typeof meta.avatar_url === "string" && meta.avatar_url.trim()) ||
    (typeof meta.picture === "string" && meta.picture.trim()) ||
    "";
  const safeAvatarUrl = /^https:\/\/[^\s]+$/i.test(rawAvatar) ? rawAvatar : null;

  return {
    id: user.id,
    email,
    username: rawName,
    emailVerified: Boolean(user.email_confirmed_at || user.confirmed_at),
    avatarUrl: safeAvatarUrl,
  };
}

interface GoTrueRawResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: SafeAuthError;
  rawCode?: string;
  rawMessage?: string;
}

async function callGoTrue<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    bearerToken?: string;
    useServiceKey?: boolean;
  } = {}
): Promise<GoTrueRawResult<T>> {
  const { url, apiKey } = getSupabaseConfig();
  const headers: Record<string, string> = {
    apikey: apiKey,
    "Content-Type": "application/json",
  };

  if (options.bearerToken) {
    headers["Authorization"] = `Bearer ${options.bearerToken}`;
  } else if (options.useServiceKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const res = await fetch(`${url}${path}`, {
      method: options.method || "POST",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });

    let parsed: Record<string, unknown> | null = null;
    const text = await res.text();
    if (text) {
      try {
        parsed = JSON.parse(text) as Record<string, unknown>;
      } catch {
        parsed = null;
      }
    }

    if (!res.ok) {
      const rawCode =
        (typeof parsed?.error_code === "string" && parsed.error_code) ||
        (typeof parsed?.error === "string" && parsed.error) ||
        (typeof parsed?.code === "string" && parsed.code) ||
        "";
      const rawMessage =
        (typeof parsed?.msg === "string" && parsed.msg) ||
        (typeof parsed?.error_description === "string" &&
          parsed.error_description) ||
        (typeof parsed?.message === "string" && parsed.message) ||
        (typeof parsed?.error === "string" && parsed.error) ||
        "";

      return {
        ok: false,
        status: res.status,
        data: null,
        rawCode,
        rawMessage,
        error: mapProviderAuthError(rawCode, rawMessage, res.status),
      };
    }

    return {
      ok: true,
      status: res.status,
      data: parsed as unknown as T,
    };
  } catch {
    return {
      ok: false,
      status: 503,
      data: null,
      error: {
        status: 503,
        code: "NETWORK_ERROR",
        message:
          "Unable to reach the authentication service. Please check your connection and try again.",
      },
    };
  }
}

export async function supabaseAdminFindUserByEmail(
  email: string
): Promise<SupabaseUserPayload | null> {
  const normalized = email.trim().toLowerCase();
  const res = await callGoTrue<{ users?: SupabaseUserPayload[] }>(
    `/auth/v1/admin/users?filter=${encodeURIComponent(normalized)}&page=1&per_page=50`,
    { method: "GET", useServiceKey: true }
  );
  if (!res.ok || !res.data?.users) return null;
  return (
    res.data.users.find((u) => (u.email || "").toLowerCase() === normalized) ??
    null
  );
}

export async function supabaseSignInWithPassword(
  email: string,
  password: string
) {
  return callGoTrue<SupabaseSessionPayload>(
    "/auth/v1/token?grant_type=password",
    {
      method: "POST",
      body: { email, password },
    }
  );
}

export async function supabaseSignUp(
  email: string,
  password: string,
  username: string,
  emailRedirectTo: string
) {
  return callGoTrue<{
    id?: string;
    user?: SupabaseUserPayload;
    session?: SupabaseSessionPayload | null;
    email_confirmed_at?: string | null;
  }>(`/auth/v1/signup?redirect_to=${encodeURIComponent(emailRedirectTo)}`, {
    method: "POST",
    body: {
      email,
      password,
      data: {
        username,
        full_name: username,
      },
    },
  });
}

export async function supabaseResendVerification(
  email: string,
  emailRedirectTo: string
) {
  return callGoTrue<Record<string, unknown>>(
    `/auth/v1/resend?redirect_to=${encodeURIComponent(emailRedirectTo)}`,
    {
      method: "POST",
      body: {
        type: "signup",
        email,
      },
    }
  );
}

export async function supabaseRecoverPassword(
  email: string,
  redirectTo: string
) {
  return callGoTrue<Record<string, unknown>>(
    `/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
    {
      method: "POST",
      body: { email },
    }
  );
}

export async function supabaseGetUser(accessToken: string) {
  return callGoTrue<SupabaseUserPayload>("/auth/v1/user", {
    method: "GET",
    bearerToken: accessToken,
  });
}

export async function supabaseRefreshSession(refreshToken: string) {
  return callGoTrue<SupabaseSessionPayload>(
    "/auth/v1/token?grant_type=refresh_token",
    {
      method: "POST",
      body: { refresh_token: refreshToken },
    }
  );
}

export async function supabaseUpdatePassword(
  accessToken: string,
  password: string
) {
  return callGoTrue<SupabaseUserPayload>("/auth/v1/user", {
    method: "PUT",
    bearerToken: accessToken,
    body: { password },
  });
}

export async function supabaseSignOut(accessToken: string) {
  return callGoTrue<Record<string, unknown>>("/auth/v1/logout?scope=local", {
    method: "POST",
    bearerToken: accessToken,
  });
}

export async function supabaseVerifyOtp(
  tokenHash: string,
  type: "signup" | "recovery" | "email" | "invite" | "magiclink"
) {
  return callGoTrue<SupabaseSessionPayload>("/auth/v1/verify", {
    method: "POST",
    body: {
      token_hash: tokenHash,
      type,
    },
  });
}

export async function supabaseExchangePkce(
  authCode: string,
  codeVerifier: string
) {
  return callGoTrue<SupabaseSessionPayload>("/auth/v1/token?grant_type=pkce", {
    method: "POST",
    body: {
      auth_code: authCode,
      code_verifier: codeVerifier,
    },
  });
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function createPkcePair(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const verifier = toBase64Url(randomBytes);
  const encoded = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const challenge = toBase64Url(new Uint8Array(digest));
  return { verifier, challenge };
}

export function buildGoogleOAuthUrl(
  redirectTo: string,
  codeChallenge: string
): string {
  const baseUrl = getPublicSupabaseUrl();
  const params = new URLSearchParams({
    provider: "google",
    redirect_to: redirectTo,
    code_challenge: codeChallenge,
    code_challenge_method: "s256",
    prompt: "select_account",
  });
  return `${baseUrl}/auth/v1/authorize?${params.toString()}`;
}

export function getOriginFromRequest(req: NextRequest): string {
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (req.nextUrl.protocol ? req.nextUrl.protocol.replace(":", "") : "http");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (host) return `${proto}://${host}`;
  return req.nextUrl.origin;
}

function isSecureRequest(req?: NextRequest): boolean {
  if (process.env.NODE_ENV === "production") {
    if (!req) return true;
    const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol;
    return proto.startsWith("https");
  }
  return false;
}

export function setAuthCookies(
  res: NextResponse,
  session: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  },
  req?: NextRequest
) {
  const secure = isSecureRequest(req);
  const accessMaxAge = Math.max(300, Math.min(session.expires_in ?? 3600, 86400));

  res.cookies.set(ACCESS_COOKIE, session.access_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: accessMaxAge,
  });

  if (session.refresh_token) {
    res.cookies.set(REFRESH_COOKIE, session.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure,
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}

export function setRecoveryCookie(
  res: NextResponse,
  accessToken: string,
  req?: NextRequest
) {
  res.cookies.set(RECOVERY_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isSecureRequest(req),
    maxAge: 60 * 15,
  });
}

export function clearAuthCookies(res: NextResponse, req?: NextRequest) {
  const secure = isSecureRequest(req);
  const expired = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure,
    maxAge: 0,
  };
  res.cookies.set(ACCESS_COOKIE, "", expired);
  res.cookies.set(REFRESH_COOKIE, "", expired);
  res.cookies.set(RECOVERY_COOKIE, "", expired);
  res.cookies.set(PKCE_COOKIE, "", expired);
}
