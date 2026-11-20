export interface AuthUser {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  avatarUrl?: string | null;
}

export class AuthApiError extends Error {
  status: number;
  code: string;
  field?: string;

  constructor(message: string, status = 400, code = "AUTH_ERROR", field?: string) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

async function authFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new AuthApiError(
      "Network error. Please check your internet connection and try again.",
      0,
      "NETWORK_ERROR"
    );
  }

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }

  if (!res.ok) {
    const message =
      typeof data.message === "string"
        ? data.message
        : "Unable to complete your request. Please try again.";
    const code = typeof data.code === "string" ? data.code : "AUTH_ERROR";
    const field = typeof data.field === "string" ? data.field : undefined;
    throw new AuthApiError(message, res.status, code, field);
  }

  return data as T;
}

export async function signInWithEmail(
  email: string,
  password: string,
  meta?: { website?: string; formStartedAt?: number }
): Promise<{ authenticated: boolean; user: AuthUser }> {
  return authFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      website: meta?.website,
      formStartedAt: meta?.formStartedAt,
    }),
  });
}

export async function signUpWithEmail(payload: {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  website?: string;
  formStartedAt?: number;
}): Promise<{ requiresVerification: boolean; email: string; message: string }> {
  return authFetch("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resendVerificationEmail(
  email: string
): Promise<{ sent: boolean; message: string }> {
  return authFetch("/api/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function getGoogleOAuthUrl(): string {
  return "/api/auth/oauth/google";
}

export async function resetPasswordForEmail(
  email: string,
  meta?: { website?: string; formStartedAt?: number }
): Promise<{ sent: boolean; message: string }> {
  return authFetch("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({
      email,
      website: meta?.website,
      formStartedAt: meta?.formStartedAt,
    }),
  });
}

export async function checkRecoverySession(): Promise<{ valid: boolean }> {
  return authFetch("/api/auth/recovery-session", {
    method: "GET",
  });
}

export async function establishRecoverySession(payload: {
  accessToken?: string;
  tokenHash?: string;
  code?: string;
}): Promise<{ valid: boolean }> {
  return authFetch("/api/auth/recovery-session", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePassword(
  password: string,
  confirmPassword: string
): Promise<{ updated: boolean; message: string }> {
  return authFetch("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ password, confirmPassword }),
  });
}

export async function completeAuthCallback(payload: {
  code?: string;
  tokenHash?: string;
  type?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}): Promise<{
  verified: boolean;
  flowType: string;
  redirectTo: string;
  user?: AuthUser;
}> {
  return authFetch("/api/auth/callback", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function signOut(): Promise<void> {
  await authFetch("/api/auth/logout", { method: "POST" });
}

export interface AuthSessionDetails {
  user: AuthUser;
  expiresAt: number | null;
  sessionExpiresAt: number | null;
  idleExpiresAt: number | null;
}

let inflightClientRefresh: Promise<{
  authenticated: boolean;
  expiresAt: number | null;
  sessionExpiresAt: number | null;
  idleExpiresAt: number | null;
}> | null = null;

export async function refreshAuthSession(force = false): Promise<{
  authenticated: boolean;
  expiresAt: number | null;
  sessionExpiresAt: number | null;
  idleExpiresAt: number | null;
}> {
  if (inflightClientRefresh) {
    return inflightClientRefresh;
  }

  inflightClientRefresh = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      if (!res.ok) {
        return {
          authenticated: false,
          expiresAt: null,
          sessionExpiresAt: null,
          idleExpiresAt: null,
        };
      }
      const data = (await res.json()) as {
        authenticated?: boolean;
        expiresAt?: number | null;
        sessionExpiresAt?: number | null;
        idleExpiresAt?: number | null;
      };
      return {
        authenticated: Boolean(data.authenticated),
        expiresAt: data.expiresAt ?? null,
        sessionExpiresAt: data.sessionExpiresAt ?? null,
        idleExpiresAt: data.idleExpiresAt ?? null,
      };
    } catch {
      return {
        authenticated: false,
        expiresAt: null,
        sessionExpiresAt: null,
        idleExpiresAt: null,
      };
    } finally {
      inflightClientRefresh = null;
    }
  })();

  return inflightClientRefresh;
}

export async function getCurrentSessionDetails(): Promise<AuthSessionDetails | null> {
  try {
    const res = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      authenticated?: boolean;
      user?: AuthUser | null;
      expiresAt?: number | null;
      sessionExpiresAt?: number | null;
      idleExpiresAt?: number | null;
    };
    if (!data.authenticated || !data.user) return null;
    return {
      user: data.user,
      expiresAt: data.expiresAt ?? null,
      sessionExpiresAt: data.sessionExpiresAt ?? null,
      idleExpiresAt: data.idleExpiresAt ?? null,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const details = await getCurrentSessionDetails();
  return details ? details.user : null;
}

export async function getCurrentSession(): Promise<{ user: AuthUser } | null> {
  const user = await getCurrentUser();
  return user ? { user } : null;
}
