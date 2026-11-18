"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";
import { completeAuthCallback, getCurrentUser } from "@/lib/supabase";

let callbackInFlight = false;

/**
 * Handles implicit OAuth/signup/recovery URL hash fragments (#access_token=...)
 * and acts as a safe fallback for callback links. Guarded against React
 * StrictMode double-invocation so hash tokens are never stripped twice before
 * verification completes.
 */
export default function AuthCallbackPage() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const rawHash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : "";
    const hashParams = new URLSearchParams(rawHash);

    const authErr =
      searchParams.get("error_code") ||
      hashParams.get("error_code") ||
      searchParams.get("error_description") ||
      searchParams.get("error") ||
      hashParams.get("error_description") ||
      hashParams.get("error");

    if (authErr) {
      if (rawHash) {
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search
        );
      }
      window.location.replace(
        `/login?error=${encodeURIComponent(authErr)}`
      );
      return;
    }

    const code = searchParams.get("code") || undefined;
    const tokenHash = searchParams.get("token_hash") || undefined;
    const type =
      searchParams.get("type") || hashParams.get("type") || undefined;
    const accessToken = hashParams.get("access_token") || undefined;
    const refreshToken = hashParams.get("refresh_token") || undefined;
    const expiresInRaw = hashParams.get("expires_in");
    const expiresIn = expiresInRaw ? Number(expiresInRaw) : undefined;

    if (callbackInFlight) {
      return;
    }

    if (!code && !tokenHash && !accessToken) {
      callbackInFlight = true;
      getCurrentUser()
        .then((user) => {
          if (user) {
            window.location.replace("/dashboard");
            return;
          }
          window.location.replace(
            `/login?error=${encodeURIComponent(
              "Verification link is invalid or has expired. Please log in or request a new link."
            )}`
          );
        })
        .catch(() => {
          window.location.replace("/login");
        });
      return;
    }

    callbackInFlight = true;

    if (rawHash) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
    }

    completeAuthCallback({
      code,
      tokenHash,
      type,
      accessToken,
      refreshToken,
      expiresIn,
    })
      .then((res) => {
        if (res.flowType === "recovery") {
          window.location.replace("/reset-password");
          return;
        }
        window.location.replace(res.redirectTo || "/dashboard");
      })
      .catch((err) => {
        callbackInFlight = false;
        const msg =
          err instanceof Error && err.message
            ? err.message
            : "Verification link is invalid or has expired. Please try again.";
        setErrorMsg(msg);
        window.setTimeout(() => {
          window.location.replace(`/login?error=${encodeURIComponent(msg)}`);
        }, 1200);
      });
  }, []);

  if (errorMsg) {
    return (
      <>
        <header className="auth-header">
          <h1 className="auth-title">Verification Failed</h1>
          <p className="auth-subtitle">
            We couldn&#8217;t complete your verification link.
          </p>
        </header>

        <div className="auth-state-box auth-state-box--error">
          <span className="auth-state-icon" aria-hidden="true">
            <AlertTriangle className="w-5 h-5" />
          </span>
          <p className="auth-state-text">{errorMsg}</p>
        </div>

        <div className="auth-state-actions">
          <Link href="/login" className="auth-btn-primary">
            Go to Login
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="auth-header">
        <h1 className="auth-title">Signing You In</h1>
        <p className="auth-subtitle">
          Verifying your email and opening your dashboard...
        </p>
      </header>

      <div className="auth-state-box">
        <span className="auth-state-icon" aria-hidden="true">
          <Loader2 className="w-5 h-5 auth-spinner" />
        </span>
        <p className="auth-state-text">
          Please wait a moment while we complete your session.
        </p>
      </div>
    </>
  );
}
