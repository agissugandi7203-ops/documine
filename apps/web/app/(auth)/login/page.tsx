"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  completeAuthCallback,
  getCurrentUser,
  getGoogleOAuthUrl,
  resendVerificationEmail,
  signInWithEmail,
} from "@/lib/supabase";
import {
  normalizeEmail,
  sanitizeRedirectPath,
  validateEmailFormat,
} from "@/lib/auth-validation";
import {
  type AuthNotice,
  type AuthNoticeVariant,
  getFriendlyFieldValidation,
  mapLoginError,
  mapLoginUrlFeedback,
} from "@/lib/auth-feedback";
import {
  AuthDivider,
  AuthFeedbackSlot,
  AuthField,
  AuthSubmitButton,
  AuthToast,
  GoogleAuthButton,
} from "@/components/auth/AuthPrimitives";

export default function LoginPage() {
  const formStartedAtRef = useRef<number>(Date.now());
  const toastIdRef = useRef<number>(0);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [redirectTo, setRedirectTo] = useState("/dashboard");

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);
  const [bannerInfo, setBannerInfo] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [toast, setToast] = useState<AuthNotice | null>(null);

  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const showToast = useCallback(
    (variant: AuthNoticeVariant, title: string, message: string) => {
      toastIdRef.current += 1;
      setToast({
        id: toastIdRef.current,
        variant,
        title,
        message,
      });
    },
    []
  );

  const clearFeedback = useCallback(() => {
    setBannerError(null);
    setBannerSuccess(null);
    setBannerInfo(null);
    setUnverifiedEmail(null);
    setToast(null);
  }, []);

  useEffect(() => {
    if (!toast || redirecting) return;
    const timer = window.setTimeout(() => {
      setToast((current) => (current?.id === toast.id ? null : current));
    }, 5200);
    return () => window.clearTimeout(timer);
  }, [toast, redirecting]);

  useEffect(() => {
    formStartedAtRef.current = Date.now();
    const params = new URLSearchParams(window.location.search);
    const rawHash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : "";
    const hashParams = new URLSearchParams(rawHash);

    const nextPath = params.get("redirect");
    const resolvedRedirect = sanitizeRedirectPath(nextPath, "/dashboard");
    if (nextPath) {
      setRedirectTo(resolvedRedirect);
    }

    // If an auth verification/OAuth token landed directly on /login (e.g. via
    // Supabase Site URL fallback), complete the session and go straight to dashboard.
    const accessToken = hashParams.get("access_token") || undefined;
    const refreshToken = hashParams.get("refresh_token") || undefined;
    const expiresInRaw = hashParams.get("expires_in");
    const expiresIn = expiresInRaw ? Number(expiresInRaw) : undefined;
    const code = params.get("code") || undefined;
    const tokenHash = params.get("token_hash") || undefined;
    const flowType =
      params.get("type") || hashParams.get("type") || undefined;

    if (rawHash) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
    }

    let active = true;

    if (accessToken || code || tokenHash) {
      setRedirecting(true);
      setBannerInfo("Completing verification and opening your dashboard...");
      showToast("info", "Signing you in", "Opening your dashboard...");
      completeAuthCallback({
        code,
        tokenHash,
        type: flowType,
        accessToken,
        refreshToken,
        expiresIn,
      })
        .then((res) => {
          if (!active) return;
          if (res.flowType === "recovery") {
            window.location.replace("/reset-password");
            return;
          }
          window.location.replace(res.redirectTo || resolvedRedirect);
        })
        .catch(() => {
          if (!active) return;
          setRedirecting(false);
          setBannerInfo(null);
          const msg =
            "This verification link has expired. Please log in or request a new link.";
          setBannerError(msg);
          showToast("error", "Verification link expired", msg);
        });
      return () => {
        active = false;
      };
    }

    const hashError =
      hashParams.get("error_code") ||
      hashParams.get("error_description") ||
      hashParams.get("error");
    if (hashError && !params.get("error")) {
      params.set("error", hashError);
    }

    const urlFeedback = mapLoginUrlFeedback(params);
    if (urlFeedback) {
      if (urlFeedback.variant === "error") {
        setBannerError(urlFeedback.message);
      } else if (urlFeedback.variant === "success") {
        setBannerSuccess(urlFeedback.message);
      } else {
        setBannerInfo(urlFeedback.message);
      }
      showToast(urlFeedback.variant, urlFeedback.title, urlFeedback.message);
    }

    getCurrentUser()
      .then((user) => {
        if (active && user) {
          window.location.replace(resolvedRedirect);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [showToast]);

  const handleEmailBlur = () => {
    if (!email.trim()) return;
    const rawErr = validateEmailFormat(email);
    setEmailError(getFriendlyFieldValidation("email", email, rawErr));
  };

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading || googleLoading || redirecting) return;

    clearFeedback();

    const formData = new FormData(e.currentTarget);
    const rawEmail = email || String(formData.get("email") ?? "");
    const rawPassword = password || String(formData.get("password") ?? "");
    if (!email && rawEmail) setEmail(rawEmail);
    if (!password && rawPassword) setPassword(rawPassword);

    const normalized = normalizeEmail(rawEmail);
    const nextEmailErr = getFriendlyFieldValidation(
      "email",
      rawEmail,
      validateEmailFormat(normalized)
    );
    const nextPasswordErr = getFriendlyFieldValidation(
      "password",
      rawPassword,
      rawPassword ? null : "Password is required."
    );

    setEmailError(nextEmailErr);
    setPasswordError(nextPasswordErr);

    if (nextEmailErr || nextPasswordErr) {
      if (nextEmailErr) {
        document.getElementById("email")?.focus();
      } else if (nextPasswordErr) {
        document.getElementById("password")?.focus();
      }
      showToast(
        "error",
        "Check your login details",
        nextEmailErr || nextPasswordErr || "Please complete the required fields."
      );
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(normalized, rawPassword, {
        website: "",
        formStartedAt: formStartedAtRef.current,
      });
      setRedirecting(true);
      const successMsg = "Signed in! Opening your dashboard...";
      setBannerSuccess(successMsg);
      showToast("success", "Welcome back", successMsg);
      window.setTimeout(() => {
        window.location.assign(redirectTo);
      }, 450);
    } catch (err) {
      const friendly = mapLoginError(err);
      setBannerError(friendly.message);
      showToast("error", friendly.title, friendly.message);

      if (friendly.field === "email") {
        setEmailError(friendly.message);
        document.getElementById("email")?.focus();
      } else if (friendly.field === "password") {
        setPasswordError(friendly.message);
        document.getElementById("password")?.focus();
      }

      if (friendly.isUnverified) {
        setUnverifiedEmail(normalized);
      }
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail || resending) return;
    setResending(true);
    try {
      const res = await resendVerificationEmail(unverifiedEmail);
      const msg =
        res.message ||
        "Verification email sent! Please check your inbox and spam folder.";
      setBannerError(null);
      setUnverifiedEmail(null);
      setBannerSuccess(msg);
      showToast("success", "Verification email sent", msg);
    } catch (err) {
      const friendly = mapLoginError(err);
      const msg =
        err instanceof Error && err.message
          ? err.message
          : friendly.message;
      setBannerError(msg);
      showToast("error", "Couldn't resend verification", msg);
    } finally {
      setResending(false);
    }
  };

  const handleGoogleLogin = () => {
    if (loading || googleLoading || redirecting) return;
    clearFeedback();
    setGoogleLoading(true);
    showToast(
      "info",
      "Connecting to Google",
      "Opening Google sign-in in a moment..."
    );
    window.location.assign(getGoogleOAuthUrl());
  };

  const isBusy = loading || googleLoading || redirecting;

  return (
    <>
      <AuthToast notice={toast} onDismiss={() => setToast(null)} />

      <header className="auth-header">
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">
          <b>Log in</b> to continue monitoring your signals.
        </p>
      </header>

      <AuthFeedbackSlot
        error={bannerError}
        success={bannerSuccess}
        info={bannerInfo}
        onDismiss={unverifiedEmail ? undefined : clearFeedback}
        action={
          unverifiedEmail ? (
            <button
              type="button"
              className="auth-feedback-action"
              onClick={handleResendVerification}
              disabled={resending}
            >
              {resending ? "Sending..." : "Resend verification email"}
            </button>
          ) : undefined
        }
      />

      <form className="auth-form" onSubmit={handleEmailLogin} noValidate>
        <AuthField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(val) => {
            setEmail(val);
            if (emailError) setEmailError(null);
            if (bannerError) setBannerError(null);
          }}
          onBlur={handleEmailBlur}
          placeholder="Eg. johndoe@gmail.com"
          autoComplete="email"
          disabled={isBusy}
          error={emailError}
        />

        <AuthField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(val) => {
            setPassword(val);
            if (passwordError) setPasswordError(null);
            if (bannerError) setBannerError(null);
          }}
          placeholder="Enter your password"
          autoComplete="current-password"
          disabled={isBusy}
          error={passwordError}
          labelAction={
            <Link href="/forgot-password" className="auth-inline-link">
              Forgot password?
            </Link>
          }
        />

        <AuthSubmitButton
          loading={loading || redirecting}
          disabled={isBusy}
          label="Login"
          loadingLabel={redirecting ? "Redirecting..." : "Signing in..."}
        />
      </form>

      <AuthDivider />

      <GoogleAuthButton
        label="Sign in with Google"
        loading={googleLoading}
        disabled={isBusy}
        onClick={handleGoogleLogin}
      />

      <p className="auth-bottom">
        Don&#8217;t have an account? <Link href="/signup">Start Free</Link>
      </p>
    </>
  );
}
