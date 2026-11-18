import { NextRequest, NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/auth-validation";

/**
 * Curated list of disposable / temporary email domains used to mitigate
 * automated throwaway registrations while never blocking legitimate providers.
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "10minutemail.com",
  "10minutemail.net",
  "20minutemail.com",
  "dispostable.com",
  "dropmail.me",
  "emailondeck.com",
  "fakeinbox.com",
  "getairmail.com",
  "getnada.com",
  "guerrillamail.biz",
  "guerrillamail.com",
  "guerrillamail.de",
  "guerrillamail.info",
  "guerrillamail.net",
  "guerrillamail.org",
  "harakirimail.com",
  "inboxkitten.com",
  "mailcatch.com",
  "maildrop.cc",
  "mailinator.com",
  "mailinator.net",
  "mailnesia.com",
  "mintemail.com",
  "mohmal.com",
  "mytemp.email",
  "sharklasers.com",
  "spam4.me",
  "temp-mail.io",
  "temp-mail.org",
  "tempail.com",
  "tempmail.com",
  "tempmail.net",
  "tempmailo.com",
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.net",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
]);

export function isDisposableEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  const domain = normalized.split("@")[1];
  if (!domain) return false;
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

interface RateBucket {
  timestamps: number[];
}

interface LockoutBucket {
  failures: number;
  lockedUntil: number;
  lastAttempt: number;
}

const rateBuckets = new Map<string, RateBucket>();
const loginLockouts = new Map<string, LockoutBucket>();

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "127.0.0.1";
}

/**
 * Verifies same-origin for sensitive mutating API calls using Origin/Referer headers.
 */
export function validateSameOrigin(req: NextRequest): NextResponse | null {
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").toLowerCase();
  if (!host) return null;

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host.toLowerCase() !== host) {
        return NextResponse.json(
          { code: "FORBIDDEN_ORIGIN", message: "Cross-origin request rejected." },
          { status: 403 }
        );
      }
      return null;
    } catch {
      return NextResponse.json(
        { code: "FORBIDDEN_ORIGIN", message: "Invalid request origin." },
        { status: 403 }
      );
    }
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      if (new URL(referer).host.toLowerCase() !== host) {
        return NextResponse.json(
          { code: "FORBIDDEN_ORIGIN", message: "Cross-origin request rejected." },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { code: "FORBIDDEN_ORIGIN", message: "Invalid request referer." },
        { status: 403 }
      );
    }
  }

  return null;
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const bucket = rateBuckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((ts) => ts > cutoff);

  if (bucket.timestamps.length >= maxRequests) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    rateBuckets.set(key, bucket);
    return { allowed: false, retryAfterSec };
  }

  bucket.timestamps.push(now);
  rateBuckets.set(key, bucket);

  // Periodic cleanup to keep memory bounded
  if (rateBuckets.size > 2000) {
    for (const [k, b] of rateBuckets.entries()) {
      if (b.timestamps.every((ts) => ts <= cutoff)) {
        rateBuckets.delete(k);
      }
    }
  }

  return { allowed: true, retryAfterSec: 0 };
}

const MAX_FAILED_LOGINS = 6;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

export function checkLoginLockout(key: string): {
  locked: boolean;
  retryAfterSec: number;
} {
  const now = Date.now();
  const bucket = loginLockouts.get(key);
  if (!bucket) return { locked: false, retryAfterSec: 0 };

  if (bucket.lockedUntil > now) {
    return {
      locked: true,
      retryAfterSec: Math.ceil((bucket.lockedUntil - now) / 1000),
    };
  }

  if (now - bucket.lastAttempt > LOCKOUT_WINDOW_MS) {
    loginLockouts.delete(key);
    return { locked: false, retryAfterSec: 0 };
  }

  return { locked: false, retryAfterSec: 0 };
}

export function recordFailedLogin(key: string): void {
  const now = Date.now();
  const prev = loginLockouts.get(key);
  if (!prev || now - prev.lastAttempt > LOCKOUT_WINDOW_MS) {
    loginLockouts.set(key, {
      failures: 1,
      lockedUntil: 0,
      lastAttempt: now,
    });
    return;
  }

  const failures = prev.failures + 1;
  loginLockouts.set(key, {
    failures,
    lockedUntil: failures >= MAX_FAILED_LOGINS ? now + LOCKOUT_DURATION_MS : 0,
    lastAttempt: now,
  });
}

export function clearLoginFailures(key: string): void {
  loginLockouts.delete(key);
}

/**
 * Lightweight anti-bot check for auth forms:
 * - Rejects requests that fill the hidden honeypot field.
 * - If a client provides a render timestamp, rejects impossibly fast submissions (< 300ms).
 */
export function checkBotSignals(body: {
  website?: unknown;
  formStartedAt?: unknown;
}): string | null {
  if (typeof body.website === "string" && body.website.trim().length > 0) {
    return "Request could not be processed. Please try again.";
  }
  if (typeof body.formStartedAt === "number" && Number.isFinite(body.formStartedAt)) {
    const elapsed = Date.now() - body.formStartedAt;
    if (elapsed >= 0 && elapsed < 300) {
      return "Please take a moment to review your details and try again.";
    }
  }
  return null;
}

export interface SafeAuthError {
  status: number;
  code: string;
  message: string;
}

/**
 * Maps provider/network errors to safe, user-facing messages.
 * Never leaks stack traces, database internals, or sensitive tokens.
 */
export function mapProviderAuthError(
  rawCode?: string,
  rawMessage?: string,
  httpStatus?: number
): SafeAuthError {
  const code = (rawCode || "").toLowerCase();
  const msg = (rawMessage || "").toLowerCase();

  if (
    httpStatus === 429 ||
    code.includes("rate_limit") ||
    code.includes("too_many") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("for security purposes")
  ) {
    return {
      status: 429,
      code: "RATE_LIMITED",
      message: "Too many attempts. Please wait a few minutes and try again.",
    };
  }

  if (
    code === "email_not_confirmed" ||
    msg.includes("email not confirmed")
  ) {
    return {
      status: 403,
      code: "EMAIL_NOT_VERIFIED",
      message:
        "Your email address has not been verified yet. Please check your inbox or resend the verification email.",
    };
  }

  if (
    code === "invalid_credentials" ||
    code === "invalid_grant" ||
    msg.includes("invalid login credentials")
  ) {
    return {
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password. Please check your credentials and try again.",
    };
  }

  if (
    code === "user_already_exists" ||
    code === "email_exists" ||
    msg.includes("already registered") ||
    msg.includes("already exists")
  ) {
    return {
      status: 409,
      code: "EMAIL_EXISTS",
      message: "An account with this email already exists. Please log in instead.",
    };
  }

  if (
    code === "otp_expired" ||
    code === "flow_state_expired" ||
    msg.includes("expired") ||
    msg.includes("invalid token") ||
    msg.includes("token has expired")
  ) {
    return {
      status: 400,
      code: "TOKEN_EXPIRED",
      message: "This link is invalid or has expired. Please request a new one.",
    };
  }

  if (
    code === "same_password" ||
    msg.includes("different from the old password")
  ) {
    return {
      status: 400,
      code: "SAME_PASSWORD",
      message: "New password must be different from your current password.",
    };
  }

  if (
    code === "weak_password" ||
    msg.includes("password should be")
  ) {
    return {
      status: 400,
      code: "WEAK_PASSWORD",
      message:
        "Password does not meet security requirements. Use at least 8 characters with uppercase, lowercase, and a number.",
    };
  }

  if (code === "validation_failed" || msg.includes("unable to validate email")) {
    return {
      status: 400,
      code: "INVALID_EMAIL",
      message: "Please enter a valid email address.",
    };
  }

  return {
    status: httpStatus && httpStatus >= 400 && httpStatus < 500 ? 400 : 500,
    code: "AUTH_ERROR",
    message:
      httpStatus && httpStatus >= 500
        ? "Authentication service is temporarily unavailable. Please try again shortly."
        : "Unable to complete authentication. Please verify your details and try again.",
  };
}
