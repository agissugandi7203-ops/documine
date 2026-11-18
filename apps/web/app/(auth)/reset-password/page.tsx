"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import {
  AuthApiError,
  checkRecoverySession,
  establishRecoverySession,
  updatePassword,
} from "@/lib/supabase";
import {
  validatePasswordMatch,
  validatePasswordPolicy,
} from "@/lib/auth-validation";
import {
  AuthFeedbackSlot,
  AuthField,
  AuthSubmitButton,
  PasswordStrengthMeter,
} from "@/components/auth/AuthPrimitives";

type RecoveryState = "verifying" | "ready" | "invalid" | "updated";

export default function ResetPasswordPage() {
  const [state, setState] = useState<RecoveryState>("verifying");
  const [linkError, setLinkError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const verifyLink = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const rawHash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : "";
      const hashParams = new URLSearchParams(rawHash);

      const urlErr =
        searchParams.get("error_description") ||
        searchParams.get("error") ||
        hashParams.get("error_description") ||
        hashParams.get("error");

      if (rawHash) {
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search
        );
      }

      if (urlErr) {
        if (active) {
          setLinkError(
            "This password reset link is invalid or has expired. Please request a new one."
          );
          setState("invalid");
        }
        return;
      }

      const accessToken = hashParams.get("access_token") || "";
      const tokenHash = searchParams.get("token_hash") || "";
      const code = searchParams.get("code") || "";

      if (accessToken || tokenHash || code) {
        await establishRecoverySession({
          accessToken: accessToken || undefined,
          tokenHash: tokenHash || undefined,
          code: code || undefined,
        });
        if (active) setState("ready");
        return;
      }

      await checkRecoverySession();
      if (active) setState("ready");
    };

    verifyLink().catch((err) => {
      if (!active) return;
      const msg =
        err instanceof AuthApiError
          ? err.message
          : "This password reset link is invalid or has expired. Please request a new one.";
      setLinkError(msg);
      setState("invalid");
    });

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setBannerError(null);
    const nextPwErr = validatePasswordPolicy(password);
    const nextConfirmErr = validatePasswordMatch(password, confirmPassword);
    setPasswordError(nextPwErr);
    setConfirmError(nextConfirmErr);

    if (nextPwErr || nextConfirmErr) {
      return;
    }

    setLoading(true);
    try {
      const res = await updatePassword(password, confirmPassword);
      setSuccessMsg(res.message);
      setState("updated");
    } catch (err) {
      if (err instanceof AuthApiError) {
        if (err.field === "password") setPasswordError(err.message);
        else if (err.field === "confirmPassword") setConfirmError(err.message);
        setBannerError(err.message);
        if (err.code === "TOKEN_EXPIRED") {
          setLinkError(err.message);
          setState("invalid");
        }
      } else {
        setBannerError("Could not update password. Please request a new link.");
      }
      setLoading(false);
    }
  };

  if (state === "verifying") {
    return (
      <>
        <header className="auth-header">
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">
            Verifying your password reset link...
          </p>
        </header>

        <AuthFeedbackSlot />

        <div className="auth-state-box">
          <span className="auth-state-icon" aria-hidden="true">
            <Loader2 className="w-5 h-5 auth-spinner" />
          </span>
          <p className="auth-state-text">
            Validating your recovery token. This only takes a moment.
          </p>
        </div>

        <p className="auth-bottom">
          Need a fresh link?{" "}
          <Link href="/forgot-password">Request Reset Link</Link>
        </p>
      </>
    );
  }

  if (state === "invalid") {
    return (
      <>
        <header className="auth-header">
          <h1 className="auth-title">Link Expired</h1>
          <p className="auth-subtitle">
            We couldn&#8217;t validate your password reset link.
          </p>
        </header>

        <AuthFeedbackSlot />

        <div className="auth-state-box auth-state-box--error">
          <span className="auth-state-icon" aria-hidden="true">
            <AlertTriangle className="w-5 h-5" />
          </span>
          <p className="auth-state-text">
            {linkError ||
              "This password reset link is invalid or has expired. Please request a new one."}
          </p>
        </div>

        <div className="auth-state-actions">
          <Link href="/forgot-password" className="auth-btn-primary">
            Request New Reset Link
          </Link>
          <Link href="/login" className="auth-btn-secondary">
            Back to Login
          </Link>
        </div>
      </>
    );
  }

  if (state === "updated") {
    return (
      <>
        <header className="auth-header">
          <h1 className="auth-title">Password Updated</h1>
          <p className="auth-subtitle">
            Your Signal account credentials have been updated.
          </p>
        </header>

        <AuthFeedbackSlot />

        <div className="auth-state-box auth-state-box--success">
          <span className="auth-state-icon" aria-hidden="true">
            <CheckCircle2 className="w-5 h-5" />
          </span>
          <p className="auth-state-text">
            {successMsg ||
              "Your password has been updated successfully. Please log in with your new password."}
          </p>
        </div>

        <div className="auth-state-actions">
          <Link href="/login?reset=success" className="auth-btn-primary">
            Continue to Login
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="auth-header">
        <h1 className="auth-title">Set New Password</h1>
        <p className="auth-subtitle">
          Choose a <b>new password</b> for your Signal account.
        </p>
      </header>

      <AuthFeedbackSlot error={bannerError} />

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <AuthField
          id="password"
          label="New Password"
          type="password"
          value={password}
          onChange={(val) => {
            setPassword(val);
            if (passwordError) setPasswordError(null);
          }}
          onBlur={() => {
            if (password) setPasswordError(validatePasswordPolicy(password));
          }}
          placeholder="Enter a strong new password"
          autoComplete="new-password"
          disabled={loading}
          error={passwordError}
          footer={<PasswordStrengthMeter password={password} />}
        />

        <AuthField
          id="confirmPassword"
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(val) => {
            setConfirmPassword(val);
            if (confirmError) setConfirmError(null);
          }}
          onBlur={() => {
            if (confirmPassword) {
              setConfirmError(validatePasswordMatch(password, confirmPassword));
            }
          }}
          placeholder="Re-enter your new password"
          autoComplete="new-password"
          disabled={loading}
          error={confirmError}
        />

        <AuthSubmitButton
          loading={loading}
          label="Reset Password"
          loadingLabel="Updating password..."
        />
      </form>

      <p className="auth-bottom">
        Ready to sign in? <Link href="/login">Back to Login</Link>
      </p>
    </>
  );
}
