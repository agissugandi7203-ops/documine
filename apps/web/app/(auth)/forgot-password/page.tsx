"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { AuthApiError, resetPasswordForEmail } from "@/lib/supabase";
import { normalizeEmail, validateEmailFormat } from "@/lib/auth-validation";
import {
  AuthFeedbackSlot,
  AuthField,
  AuthSubmitButton,
} from "@/components/auth/AuthPrimitives";

export default function ForgotPasswordPage() {
  const formStartedAtRef = useRef<number>(Date.now());
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    formStartedAtRef.current = Date.now();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setBannerError(null);
    const normalized = normalizeEmail(email);
    const nextEmailErr = validateEmailFormat(normalized);
    setEmailError(nextEmailErr);
    if (nextEmailErr) return;

    setLoading(true);
    try {
      const res = await resetPasswordForEmail(normalized, {
        website,
        formStartedAt: formStartedAtRef.current,
      });
      setSentMessage(res.message);
    } catch (err) {
      if (err instanceof AuthApiError) {
        setBannerError(err.message);
      } else {
        setBannerError("Could not process reset request. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (sentMessage) {
    return (
      <>
        <header className="auth-header">
          <h1 className="auth-title">Check Your Inbox</h1>
          <p className="auth-subtitle">
            Password reset instructions have been processed.
          </p>
        </header>

        <AuthFeedbackSlot />

        <div className="auth-state-box auth-state-box--success">
          <span className="auth-state-icon" aria-hidden="true">
            <MailCheck className="w-5 h-5" />
          </span>
          <p className="auth-state-text">{sentMessage}</p>
        </div>

        <div className="auth-state-actions">
          <Link href="/login" className="auth-btn-primary">
            Back to Login
          </Link>
          <button
            type="button"
            className="auth-btn-secondary"
            onClick={() => {
              setSentMessage(null);
              setBannerError(null);
            }}
          >
            Try Another Email
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="auth-header">
        <h1 className="auth-title">Forgot Password</h1>
        <p className="auth-subtitle">
          Enter your email to <b>recover access</b> to your workspace.
        </p>
      </header>

      <AuthFeedbackSlot error={bannerError} />

      <form className="auth-form" onSubmit={handleSubmit} noValidate>

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
          disabled={loading}
          error={emailError}
        />

        <AuthSubmitButton
          loading={loading}
          label="Send Reset Link"
          loadingLabel="Sending link..."
        />
      </form>

      <p className="auth-bottom">
        Remembered your password? <Link href="/login">Back to Login</Link>
      </p>
    </>
  );
}
