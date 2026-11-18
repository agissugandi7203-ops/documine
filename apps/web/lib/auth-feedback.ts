import { AuthApiError } from "@/lib/supabase";

export type AuthNoticeVariant = "error" | "success" | "info";

export interface AuthNotice {
  id: number;
  variant: AuthNoticeVariant;
  title: string;
  message: string;
}

export interface FriendlyLoginError {
  title: string;
  message: string;
  field?: "email" | "password";
  isUnverified?: boolean;
}

/**
 * Converts backend/network auth errors into concise, user-friendly notifications
 * with clear next steps instead of exposing raw technical statuses.
 */
export function mapLoginError(err: unknown): FriendlyLoginError {
  if (!(err instanceof AuthApiError)) {
    return {
      title: "Unable to sign in",
      message: "Something unexpected happened. Please try again in a moment.",
    };
  }

  switch (err.code) {
    case "INVALID_CREDENTIALS":
      return {
        title: "Incorrect email or password",
        message:
          "Please double-check your details and try again, or use Forgot password below.",
      };
    case "EMAIL_NOT_VERIFIED":
      return {
        title: "Verify your email first",
        message:
          "Check your inbox for the verification link, or click Resend below.",
        isUnverified: true,
      };
    case "INVALID_EMAIL":
      return {
        title: "Check your email address",
        message: "Please enter a valid email address (for example, name@company.com).",
        field: "email",
      };
    case "PASSWORD_REQUIRED":
      return {
        title: "Password required",
        message: "Please enter your password to sign in.",
        field: "password",
      };
    case "RATE_LIMITED":
    case "ACCOUNT_TEMPORARILY_LOCKED":
      return {
        title: "Too many sign-in attempts",
        message: err.message,
      };
    case "BOT_BLOCKED":
    case "INVALID_REQUEST":
      return {
        title: "Request couldn't be verified",
        message: "Please refresh the page or submit the form again.",
      };
    case "NETWORK_ERROR":
      return {
        title: "Connection problem",
        message: "Check your internet connection and try logging in again.",
      };
    case "SERVICE_UNAVAILABLE":
      return {
        title: "Service temporarily busy",
        message: "Our login server is taking a moment to respond. Please try again shortly.",
      };
    default:
      if (err.status >= 500) {
        return {
          title: "Service temporarily unavailable",
          message: "Please wait a few seconds and try signing in again.",
        };
      }
      return {
        title: "Could not sign in",
        message: err.message || "Please check your details and try again.",
      };
  }
}

/**
 * Translates redirect query params on /login (?error, ?verified, ?reset, ?message)
 * into user-friendly status notifications.
 */
export function mapLoginUrlFeedback(
  params: URLSearchParams
): Omit<AuthNotice, "id"> | null {
  const urlError = params.get("error")?.trim();
  const urlMessage = params.get("message")?.trim();
  const verified = params.get("verified");
  const reset = params.get("reset");

  if (urlError) {
    const lower = urlError.toLowerCase();
    if (lower === "access_denied" || lower.includes("cancel")) {
      return {
        variant: "info",
        title: "Google sign-in canceled",
        message: "You can try Google again anytime or log in with your email.",
      };
    }
    if (lower.includes("expired") || lower === "otp_expired") {
      return {
        variant: "error",
        title: "Verification link expired",
        message: "Please sign in again or request a fresh link.",
      };
    }
    if (lower.includes("session expired") || lower === "pkce_missing") {
      return {
        variant: "error",
        title: "Verification session expired",
        message:
          "Please log in with your email and password, or request a new link.",
      };
    }
    if (lower === "oauth_failed" || lower === "server_error") {
      return {
        variant: "error",
        title: "Google sign-in didn't complete",
        message: "Please try again or sign in with your email and password.",
      };
    }
    return {
      variant: "error",
      title: "Sign-in notice",
      message: urlError,
    };
  }

  if (verified === "1") {
    return {
      variant: "success",
      title: "Email verified",
      message: "Your account is active. You can log in now.",
    };
  }

  if (reset === "success") {
    return {
      variant: "success",
      title: "Password updated",
      message: "Your new password is ready. Log in to continue.",
    };
  }

  if (urlMessage) {
    return {
      variant: "info",
      title: "Welcome",
      message: urlMessage,
    };
  }

  return null;
}

export function getFriendlyFieldValidation(
  field: "email" | "password",
  rawValue: string,
  validationError: string | null
): string | null {
  if (!validationError) return null;
  if (field === "email") {
    if (!rawValue.trim()) {
      return "Please enter your email address.";
    }
    return "That doesn't look like a valid email (e.g. name@company.com).";
  }
  return "Please enter your password.";
}
