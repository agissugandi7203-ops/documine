import { NextRequest, NextResponse } from "next/server";
import { mapProviderAuthError, type SafeAuthError } from "./security";

export const ACCESS_COOKIE = "sb_access_token";
export const REFRESH_COOKIE = "sb_refresh_token";
export const SESSION_EXP_COOKIE = "sb_session_exp";
export const RECOVERY_COOKIE = "sb_recovery_token";
export const PKCE_COOKIE = "sb_pkce_verifier";

function parseBoundedEnvSeconds(
  raw: string | undefined,
  fallback: number,
  minSec: number,
  maxSec: number
): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.max(minSec, Math.min(maxSec, Math.floor(parsed)));
}

/** Strict finite lifetimes so NO token or session can ever remain non-expiring. */
export const ACCESS_TOKEN_MAX_TTL_SEC = parseBoundedEnvSeconds(
  process.env.SESSION_ACCESS_MAX_AGE_SECONDS,
  3600,
  60,
  3600
);
export const REFRESH_IDLE_TTL_SEC = parseBoundedEnvSeconds(
  process.env.SESSION_REFRESH_TTL_SECONDS,
  60 * 60 * 24 * 3, // 3 days idle timeout
  300,
  60 * 60 * 24 * 7
);
export const SESSION_ABSOLUTE_TTL_SEC = Math.max(
  REFRESH_IDLE_TTL_SEC,
  parseBoundedEnvSeconds(
    process.env.SESSION_MAX_AGE_SECONDS,
    60 * 60 * 24 * 7, // 7 days hard absolute ceiling from initial login
    900,
    60 * 60 * 24 * 14
  )
);
const LEGACY_SESSION_CAP_SEC = Math.min(REFRESH_IDLE_TTL_SEC, 60 * 60 * 24);
export const ACCESS_PROACTIVE_REFRESH_BUFFER_SEC = 90;
export const RECOVERY_TOKEN_TTL_SEC = 60 * 15;
export const PKCE_TOKEN_TTL_SEC = 60 * 10;

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
  const raw = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).trim();
  return raw.replace(/\/+$/, "");
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

export interface ResolvedServerSession {
  authenticated: boolean;
  accessToken?: string;
  user?: SafeUser;
  accessExpEpoch?: number;
  sessionExpEpoch?: number;
  idleExpiresAtEpoch?: number;
  refreshedSession?: SupabaseSessionPayload;
  persistLegacyCap?: boolean;
  shouldClearCookies: boolean;
  failureReason?:
    | "missing_session"
    | "session_expired"
    | "token_expired"
    | "unverified_email";
}

interface RefreshMutexStore {
  inflight: Map<string, Promise<GoTrueRawResult<SupabaseSessionPayload>>>;
  recent: Map<
    string,
    { expiresAtMs: number; result: GoTrueRawResult<SupabaseSessionPayload> }
  >;
}

function getRefreshMutexStore(): RefreshMutexStore {
  const g = globalThis as unknown as {
    __documindRefreshMutex?: RefreshMutexStore;
  };
  if (!g.__documindRefreshMutex) {
    g.__documindRefreshMutex = {
      inflight: new Map(),
      recent: new Map(),
    };
  }
  return g.__documindRefreshMutex;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return bytesToHex(new Uint8Array(digest));
}

function getSessionSigningSecret(): string {
  return (
    process.env.AUTH_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "documind-bounded-session-secret"
  );
}

async function computeSessionExpHmac(expEpochSec: number): Promise<string> {
  const keyBytes = new TextEncoder().encode(getSessionSigningSecret());
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const msgBytes = new TextEncoder().encode(`documind-sess:${expEpochSec}`);
  const sig = await crypto.subtle.sign("HMAC", key, msgBytes);
  return bytesToHex(new Uint8Array(sig));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function signSessionExpValue(expEpochSec: number): Promise<string> {
  const rounded = Math.floor(expEpochSec);
  const sig = await computeSessionExpHmac(rounded);
  return `${rounded}.${sig}`;
}

export async function verifySessionExpCookieValue(
  raw: string | undefined,
  nowSec = Math.floor(Date.now() / 1000)
): Promise<{
  status: "missing" | "tampered" | "expired" | "valid";
  expEpochSec: number | null;
}> {
  if (!raw) {
    return { status: "missing", expEpochSec: null };
  }
  const dotIdx = raw.indexOf(".");
  if (dotIdx <= 0) {
    return { status: "tampered", expEpochSec: null };
  }
  const expPart = raw.slice(0, dotIdx);
  const sigPart = raw.slice(dotIdx + 1);
  const expEpochSec = Number(expPart);
  if (!Number.isInteger(expEpochSec) || expEpochSec <= 0 || !sigPart) {
    return { status: "tampered", expEpochSec: null };
  }
  const expectedSig = await computeSessionExpHmac(expEpochSec);
  if (!constantTimeEqual(sigPart, expectedSig)) {
    return { status: "tampered", expEpochSec: null };
  }
  if (nowSec >= expEpochSec) {
    return { status: "expired", expEpochSec };
  }
  return { status: "valid", expEpochSec };
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");
    const json = atob(padded);
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Extracts a strictly finite JWT access token expiration timestamp (epoch seconds).
 * Returns null if the token is missing an `exp` claim, is already expired, or is malformed.
 */
export function getBoundedAccessTokenExpEpoch(
  accessToken: string,
  expiresIn?: number,
  nowSec = Math.floor(Date.now() / 1000)
): number | null {
  const payload = decodeJwtPayload(accessToken);
  const rawExp = payload && typeof payload.exp === "number" ? payload.exp : null;

  if (rawExp !== null) {
    if (!Number.isFinite(rawExp) || rawExp <= nowSec) {
      return null;
    }
    return Math.min(Math.floor(rawExp), nowSec + ACCESS_TOKEN_MAX_TTL_SEC);
  }

  // Fallback only if caller supplied a finite expiresIn (e.g. non-JWT provider response)
  if (typeof expiresIn === "number" && Number.isFinite(expiresIn) && expiresIn > 0) {
    return nowSec + Math.min(Math.floor(expiresIn), ACCESS_TOKEN_MAX_TTL_SEC);
  }

  return null;
}

export async function supabaseGetUser(accessToken: string) {
  return callGoTrue<SupabaseUserPayload>("/auth/v1/user", {
    method: "GET",
    bearerToken: accessToken,
  });
}

export async function supabaseRefreshSession(
  refreshToken: string
): Promise<GoTrueRawResult<SupabaseSessionPayload>> {
  const clean = refreshToken.trim();
  if (!clean) {
    return {
      ok: false,
      status: 401,
      data: null,
      error: {
        status: 401,
        code: "SESSION_EXPIRED",
        message: "Refresh token is missing. Please log in again.",
      },
    };
  }

  const key = await sha256Hex(clean);
  const store = getRefreshMutexStore();
  const nowMs = Date.now();

  // Prune expired cache entries opportunistically
  for (const [k, entry] of store.recent.entries()) {
    if (entry.expiresAtMs <= nowMs) {
      store.recent.delete(k);
    }
  }

  // Reuse short-lived successful rotation result so parallel requests never trigger reuse revocation
  const cached = store.recent.get(key);
  if (cached && cached.expiresAtMs > nowMs) {
    return cached.result;
  }

  const existingInflight = store.inflight.get(key);
  if (existingInflight) {
    return existingInflight;
  }

  const refreshPromise = (async () => {
    const res = await callGoTrue<SupabaseSessionPayload>(
      "/auth/v1/token?grant_type=refresh_token",
      {
        method: "POST",
        body: { refresh_token: clean },
      }
    );
    if (res.ok && res.data?.access_token) {
      store.recent.set(key, {
        expiresAtMs: Date.now() + 15_000,
        result: res,
      });
    }
    return res;
  })().finally(() => {
    store.inflight.delete(key);
  });

  store.inflight.set(key, refreshPromise);
  return refreshPromise;
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
  if (!/^https?:\/\/[^\s]+$/i.test(baseUrl)) {
    throw new Error(
      "Supabase URL is missing or invalid. Set SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL in your deployment environment."
    );
  }
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
  const rawProto =
    req.headers.get("x-forwarded-proto") ||
    (req.nextUrl.protocol ? req.nextUrl.protocol.replace(":", "") : "https");
  const proto = rawProto.split(",")[0]?.trim() || "https";
  const rawHost =
    req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const host = rawHost.split(",")[0]?.trim();
  if (host) return `${proto}://${host}`;
  return req.nextUrl.origin;
}

export function isSecureRequest(req?: NextRequest): boolean {
  if (process.env.NODE_ENV === "production") {
    if (!req) return true;
    const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol;
    return proto.startsWith("https");
  }
  return false;
}

export async function setAuthCookies(
  res: NextResponse,
  session: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  },
  req?: NextRequest,
  options?: {
    existingSessionExpEpoch?: number | null;
  }
): Promise<{
  accessExpEpoch: number;
  sessionExpEpoch: number;
  idleExpiresAtEpoch: number;
} | null> {
  const nowSec = Math.floor(Date.now() / 1000);
  const nowMs = nowSec * 1000;
  const secure = isSecureRequest(req);

  const boundedAccessExp = getBoundedAccessTokenExpEpoch(
    session.access_token,
    session.expires_in,
    nowSec
  );
  if (!boundedAccessExp) {
    clearAuthCookies(res, req);
    return null;
  }

  const sessionExpEpoch =
    options?.existingSessionExpEpoch && options.existingSessionExpEpoch > 0
      ? Math.floor(options.existingSessionExpEpoch)
      : nowSec + SESSION_ABSOLUTE_TTL_SEC;

  const remainingSessionSec = sessionExpEpoch - nowSec;
  if (remainingSessionSec <= 0) {
    clearAuthCookies(res, req);
    return null;
  }

  const accessExpEpoch = Math.min(boundedAccessExp, sessionExpEpoch);
  const accessMaxAge = Math.max(1, accessExpEpoch - nowSec);
  const refreshMaxAge = Math.max(
    1,
    Math.min(REFRESH_IDLE_TTL_SEC, remainingSessionSec)
  );
  const signedSessionExp = await signSessionExpValue(sessionExpEpoch);

  res.cookies.set(ACCESS_COOKIE, session.access_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: accessMaxAge,
    expires: new Date(nowMs + accessMaxAge * 1000),
  });

  if (session.refresh_token) {
    res.cookies.set(REFRESH_COOKIE, session.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure,
      maxAge: refreshMaxAge,
      expires: new Date(nowMs + refreshMaxAge * 1000),
    });
  }

  res.cookies.set(SESSION_EXP_COOKIE, signedSessionExp, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: remainingSessionSec,
    expires: new Date(nowMs + remainingSessionSec * 1000),
  });

  return {
    accessExpEpoch,
    sessionExpEpoch,
    idleExpiresAtEpoch: nowSec + refreshMaxAge,
  };
}

export async function capSessionMetadataCookies(
  res: NextResponse,
  req: NextRequest,
  sessionExpEpoch: number,
  refreshToken?: string
) {
  const nowSec = Math.floor(Date.now() / 1000);
  const remainingSessionSec = sessionExpEpoch - nowSec;
  if (remainingSessionSec <= 0) {
    clearAuthCookies(res, req);
    return;
  }
  const nowMs = nowSec * 1000;
  const secure = isSecureRequest(req);
  const refreshMaxAge = Math.max(
    1,
    Math.min(REFRESH_IDLE_TTL_SEC, remainingSessionSec)
  );
  const signedSessionExp = await signSessionExpValue(sessionExpEpoch);

  res.cookies.set(SESSION_EXP_COOKIE, signedSessionExp, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: remainingSessionSec,
    expires: new Date(nowMs + remainingSessionSec * 1000),
  });

  if (refreshToken) {
    res.cookies.set(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure,
      maxAge: refreshMaxAge,
      expires: new Date(nowMs + refreshMaxAge * 1000),
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
    maxAge: RECOVERY_TOKEN_TTL_SEC,
    expires: new Date(Date.now() + RECOVERY_TOKEN_TTL_SEC * 1000),
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
    expires: new Date(0),
  };
  res.cookies.set(ACCESS_COOKIE, "", expired);
  res.cookies.set(REFRESH_COOKIE, "", expired);
  res.cookies.set(SESSION_EXP_COOKIE, "", expired);
  res.cookies.set(RECOVERY_COOKIE, "", expired);
  res.cookies.set(PKCE_COOKIE, "", expired);
}

/**
 * Resolves and validates a request's session with strict expiration enforcement
 * for BOTH access tokens and refresh tokens (idle TTL + absolute session deadline).
 */
export async function resolveServerSession(
  req: NextRequest,
  options?: {
    minFreshSeconds?: number;
    forceRefresh?: boolean;
    verifyAccessWithProvider?: boolean;
  }
): Promise<ResolvedServerSession> {
  const nowSec = Math.floor(Date.now() / 1000);
  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  const rawSessionExp = req.cookies.get(SESSION_EXP_COOKIE)?.value;

  if (!accessToken && !refreshToken) {
    return {
      authenticated: false,
      shouldClearCookies: Boolean(rawSessionExp),
      failureReason: "missing_session",
    };
  }

  const sessionCheck = await verifySessionExpCookieValue(rawSessionExp, nowSec);
  if (sessionCheck.status === "tampered" || sessionCheck.status === "expired") {
    return {
      authenticated: false,
      shouldClearCookies: true,
      failureReason: "session_expired",
    };
  }

  const persistLegacyCap = sessionCheck.status === "missing";
  const sessionExpEpoch =
    sessionCheck.status === "valid" && sessionCheck.expEpochSec
      ? sessionCheck.expEpochSec
      : nowSec + LEGACY_SESSION_CAP_SEC;

  if (nowSec >= sessionExpEpoch) {
    return {
      authenticated: false,
      shouldClearCookies: true,
      failureReason: "session_expired",
    };
  }

  const minFreshSeconds =
    options?.minFreshSeconds ?? ACCESS_PROACTIVE_REFRESH_BUFFER_SEC;
  const forceRefresh = options?.forceRefresh ?? false;
  const verifyProvider = options?.verifyAccessWithProvider ?? true;

  if (!forceRefresh && accessToken) {
    const accessExpEpoch = getBoundedAccessTokenExpEpoch(
      accessToken,
      undefined,
      nowSec
    );
    if (accessExpEpoch && accessExpEpoch - nowSec > minFreshSeconds) {
      if (!verifyProvider) {
        const refreshMaxAge = Math.min(
          REFRESH_IDLE_TTL_SEC,
          sessionExpEpoch - nowSec
        );
        return {
          authenticated: true,
          accessToken,
          accessExpEpoch: Math.min(accessExpEpoch, sessionExpEpoch),
          sessionExpEpoch,
          idleExpiresAtEpoch: nowSec + refreshMaxAge,
          persistLegacyCap,
          shouldClearCookies: false,
        };
      }

      const userRes = await supabaseGetUser(accessToken);
      if (userRes.ok && userRes.data) {
        const safe = sanitizeUser(userRes.data);
        if (!safe.emailVerified) {
          return {
            authenticated: false,
            shouldClearCookies: true,
            failureReason: "unverified_email",
          };
        }
        const refreshMaxAge = Math.min(
          REFRESH_IDLE_TTL_SEC,
          sessionExpEpoch - nowSec
        );
        return {
          authenticated: true,
          accessToken,
          user: safe,
          accessExpEpoch: Math.min(accessExpEpoch, sessionExpEpoch),
          sessionExpEpoch,
          idleExpiresAtEpoch: nowSec + refreshMaxAge,
          persistLegacyCap,
          shouldClearCookies: false,
        };
      }
    }
  }

  // Need refresh (access missing, missing/invalid exp, expired, within proactive window, or revoked)
  if (!refreshToken) {
    return {
      authenticated: false,
      shouldClearCookies: true,
      failureReason: "token_expired",
    };
  }

  const refreshRes = await supabaseRefreshSession(refreshToken);
  if (!refreshRes.ok || !refreshRes.data?.access_token) {
    return {
      authenticated: false,
      shouldClearCookies: true,
      failureReason: "session_expired",
    };
  }

  const refreshed = refreshRes.data;
  const newAccessExp = getBoundedAccessTokenExpEpoch(
    refreshed.access_token,
    refreshed.expires_in,
    nowSec
  );
  if (!newAccessExp) {
    return {
      authenticated: false,
      shouldClearCookies: true,
      failureReason: "token_expired",
    };
  }

  let safeUser: SafeUser | undefined;
  if (refreshed.user) {
    safeUser = sanitizeUser(refreshed.user);
    if (!safeUser.emailVerified) {
      return {
        authenticated: false,
        shouldClearCookies: true,
        failureReason: "unverified_email",
      };
    }
  }

  const remainingSessionSec = sessionExpEpoch - nowSec;
  if (remainingSessionSec <= 0) {
    return {
      authenticated: false,
      shouldClearCookies: true,
      failureReason: "session_expired",
    };
  }

  const refreshMaxAge = Math.min(REFRESH_IDLE_TTL_SEC, remainingSessionSec);
  return {
    authenticated: true,
    accessToken: refreshed.access_token,
    user: safeUser,
    accessExpEpoch: Math.min(newAccessExp, sessionExpEpoch),
    sessionExpEpoch,
    idleExpiresAtEpoch: nowSec + refreshMaxAge,
    refreshedSession: refreshed,
    persistLegacyCap,
    shouldClearCookies: false,
  };
}
