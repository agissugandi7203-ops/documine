"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import {
  AuthApiError,
  getCurrentUser,
  getGoogleOAuthUrl,
  resendVerificationEmail,
  signUpWithEmail,
} from "@/lib/supabase";
import {
  normalizeEmail,
  validateEmailFormat,
  validatePasswordMatch,
  validatePasswordPolicy,
  validateUsername,
} from "@/lib/auth-validation";
import {
  AuthDivider,
  AuthFeedbackSlot,
  AuthField,
  AuthSubmitButton,
  GoogleAuthButton,
  PasswordStrengthMeter,
} from "@/components/auth/AuthPrimitives";

export default function SignupPage() {
  const formStartedAtRef = useRef<number>(Date.now());
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [website, setWebsite] = useState("");

  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    formStartedAtRef.current = Date.now();
    let active = true;
    getCurrentUser()
      .then((user) => {
        if (active && user) {
          window.location.replace("/dashboard");
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading || googleLoading) return;

    setBannerError(null);

    const nextUserErr = validateUsername(username);
    const normalized = normalizeEmail(email);
    const nextEmailErr = validateEmailFormat(normalized);
    const nextPwErr = validatePasswordPolicy(password);
    const nextConfirmErr = validatePasswordMatch(password, confirmPassword);

    setUsernameError(nextUserErr);
    setEmailError(nextEmailErr);
    setPasswordError(nextPwErr);
    setConfirmError(nextConfirmErr);

    if (nextUserErr || nextEmailErr || nextPwErr || nextConfirmErr) {
      return;
    }

    setLoading(true);
    try {
      const res = await signUpWithEmail({
        username: username.trim(),
        email: normalized,
        password,
        confirmPassword,
        website,
        formStartedAt: formStartedAtRef.current,
      });
      setVerificationEmail(res.email || normalized);
      setCooldown(30);
    } catch (err) {
      if (err instanceof AuthApiError) {
        if (err.field === "username") setUsernameError(err.message);
        else if (err.field === "email") setEmailError(err.message);
        else if (err.field === "password") setPasswordError(err.message);
        else if (err.field === "confirmPassword") setConfirmError(err.message);

        setBannerError(err.message);
      } else {
        setBannerError("Unable to create account right now. Please try again.");
      }
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!verificationEmail || resending || cooldown > 0) return;
    setResending(true);
    setBannerError(null);
    setResendMessage(null);
    try {
      const res = await resendVerificationEmail(verificationEmail);
      setResendMessage(res.message);
      setCooldown(30);
    } catch (err) {
      setBannerError(
        err instanceof Error
          ? err.message
          : "Could not resend verification email."
      );
    } finally {
      setResending(false);
    }
  };

  const handleGoogleSignup = () => {
    if (loading || googleLoading) return;
    setBannerError(null);
    setGoogleLoading(true);
    window.location.assign(getGoogleOAuthUrl());
  };

  if (verificationEmail) {
    return (
      <>
        <header className="auth-header">
          <h1 className="auth-title">Verify Your Email</h1>
          <p className="auth-subtitle">
            We sent a confirmation link to <b>{verificationEmail}</b>.
          </p>
        </header>

        <AuthFeedbackSlot error={bannerError} success={resendMessage} />

        <div className="auth-state-box auth-state-box--success">
          <span className="auth-state-icon" aria-hidden="true">
            <MailCheck className="w-5 h-5" />
          </span>
          <p className="auth-state-text">
            Please open the verification email in your inbox to activate your
            account. You will be able to log in once your email is verified.
          </p>
        </div>

        <div className="auth-state-actions">
          <Link href="/login" className="auth-btn-primary">
            Continue to Login
          </Link>

          <button
            type="button"
            className="auth-btn-secondary"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
          >
            {resending
              ? "Sending email..."
              : cooldown > 0
              ? `Resend email in ${cooldown}s`
              : "Resend Verification Email"}
          </button>
        </div>

        <p className="auth-bottom">
          Used a different email?{" "}
          <button
            type="button"
            className="auth-feedback-action"
            onClick={() => {
              setVerificationEmail(null);
              setResendMessage(null);
              setBannerError(null);
              setLoading(false);
            }}
          >
            Edit registration
          </button>
        </p>
      </>
    );
  }

  const isBusy = loading || googleLoading;

  return (
    <>
      <header className="auth-header">
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">
          <b>Start free</b> to turn research signals into action.
        </p>
      </header>

      <AuthFeedbackSlot error={bannerError} />

      <form className="auth-form" onSubmit={handleSignup} noValidate>

        <AuthField
          id="username"
          label="Username"
          type="text"
          value={username}
          onChange={(val) => {
            setUsername(val);
            if (usernameError) setUsernameError(null);
          }}
          onBlur={() => {
            if (username.trim()) setUsernameError(validateUsername(username));
          }}
          placeholder="Eg. John Doe"
          autoComplete="name"
          disabled={isBusy}
          error={usernameError}
        />

        <AuthField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(val) => {
            setEmail(val);
            if (emailError) setEmailError(null);
          }}
          onBlur={() => {
            if (email.trim()) setEmailError(validateEmailFormat(email));
          }}
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
          }}
          onBlur={() => {
            if (password) setPasswordError(validatePasswordPolicy(password));
          }}
          placeholder="Create a strong password"
          autoComplete="new-password"
          disabled={isBusy}
          error={passwordError}
          footer={<PasswordStrengthMeter password={password} />}
        />

        <AuthField
          id="confirmPassword"
          label="Confirm Password"
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
          placeholder="Re-enter your password"
          autoComplete="new-password"
          disabled={isBusy}
          error={confirmError}
        />

        <AuthSubmitButton
          loading={loading}
          disabled={isBusy}
          label="Create Account"
          loadingLabel="Creating account..."
        />
      </form>

      <AuthDivider />

      <GoogleAuthButton
        label="Sign up with Google"
        loading={googleLoading}
        disabled={isBusy}
        onClick={handleGoogleSignup}
      />

      <p className="auth-bottom">
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </>
  );
}
