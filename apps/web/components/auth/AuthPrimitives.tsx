"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  Loader2,
  X,
} from "lucide-react";
import type { AuthNotice } from "@/lib/auth-feedback";
import { evaluatePasswordStrength } from "@/lib/auth-validation";

interface AuthFieldProps {
  id: string;
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  error?: string | null;
  hint?: string;
  required?: boolean;
  labelAction?: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthField({
  id,
  label,
  type = "text",
  value,
  onChange,
  onBlur,
  placeholder,
  autoComplete,
  disabled = false,
  error = null,
  hint,
  required = true,
  labelAction,
  footer,
}: AuthFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword ? (showPassword ? "text" : "password") : type;
  const msgId = `${id}-msg`;

  return (
    <div className="auth-field-group">
      <div className="auth-label-row">
        <label htmlFor={id} className="auth-label">
          {label}
        </label>
        {labelAction}
      </div>

      <div
        className={`auth-input-wrap ${error ? "auth-input-wrap--error" : ""}`}
      >
        <input
          id={id}
          name={id}
          type={resolvedType}
          className={`auth-input ${isPassword ? "auth-input--with-toggle" : ""}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? msgId : undefined}
        />

        {isPassword && (
          <button
            type="button"
            className="auth-pw-toggle"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={disabled}
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Eye className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      <div
        id={msgId}
        className={`auth-field-msg ${error ? "auth-field-msg--error" : ""}`}
        aria-live={error ? "polite" : undefined}
      >
        {error || hint || ""}
      </div>

      {footer}
    </div>
  );
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const result = evaluatePasswordStrength(password);

  return (
    <div className="auth-pw-meter" aria-live="polite">
      <div
        className="auth-pw-track"
        role="progressbar"
        aria-label="Password strength"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={result.percent}
      >
        <div
          className={`auth-pw-fill auth-pw-fill--${result.tone}`}
          style={{ width: `${result.percent}%` }}
        />
      </div>

      <div className="auth-pw-meter-top">
        <span className={`auth-pw-label auth-pw-label--${result.tone}`}>
          {password.length === 0 ? "Password strength" : result.label}
        </span>
        <span className="auth-pw-missing">
          {password.length === 0
            ? "8+ chars, a-z, A-Z, 0-9"
            : result.allCoreMet
            ? "Ready to use"
            : `Missing: ${result.missingLabels.join(", ")}`}
        </span>
      </div>
    </div>
  );
}

interface AuthFeedbackSlotProps {
  error?: string | null;
  success?: string | null;
  info?: string | null;
  action?: React.ReactNode;
  onDismiss?: () => void;
}

function NoticeIcon({ variant }: { variant: "error" | "success" | "info" }) {
  if (variant === "success") {
    return <CheckCircle2 className="auth-notice-icon" aria-hidden="true" />;
  }
  if (variant === "info") {
    return <Info className="auth-notice-icon" aria-hidden="true" />;
  }
  return <AlertCircle className="auth-notice-icon" aria-hidden="true" />;
}

export function AuthFeedbackSlot({
  error,
  success,
  info,
  action,
  onDismiss,
}: AuthFeedbackSlotProps) {
  const variant = error
    ? "error"
    : success
    ? "success"
    : info
    ? "info"
    : null;
  const text = error || success || info || null;

  return (
    <div className="auth-feedback-slot">
      {variant && text ? (
        <div
          className={`auth-feedback auth-feedback--${variant}`}
          role={variant === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          <div className="auth-feedback-row">
            <NoticeIcon variant={variant} />
            <div className="auth-feedback-body">
              <span>{text}</span>
              {action}
            </div>
            {onDismiss ? (
              <button
                type="button"
                className="auth-feedback-close"
                onClick={onDismiss}
                aria-label="Dismiss message"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface AuthToastProps {
  notice: AuthNotice | null;
  onDismiss: () => void;
}

export function AuthToast({ notice, onDismiss }: AuthToastProps) {
  if (!notice) return null;

  return (
    <div className="auth-toast-wrap" aria-live="polite">
      <div
        key={notice.id}
        className={`auth-toast auth-toast--${notice.variant}`}
        role={notice.variant === "error" ? "alert" : "status"}
      >
        <span className="auth-toast-badge" aria-hidden="true">
          <NoticeIcon variant={notice.variant} />
        </span>
        <div className="auth-toast-copy">
          <p className="auth-toast-title">{notice.title}</p>
          <p className="auth-toast-msg">{notice.message}</p>
        </div>
        <button
          type="button"
          className="auth-toast-close"
          onClick={onDismiss}
          aria-label="Close notification"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

interface AuthSubmitButtonProps {
  loading: boolean;
  disabled?: boolean;
  label: string;
  loadingLabel: string;
}

export function AuthSubmitButton({
  loading,
  disabled = false,
  label,
  loadingLabel,
}: AuthSubmitButtonProps) {
  return (
    <button
      type="submit"
      className="auth-btn-primary"
      disabled={loading || disabled}
    >
      <span>{loading ? loadingLabel : label}</span>
      <span className="auth-btn-icon-slot" aria-hidden="true">
        {loading ? (
          <Loader2 className="w-4 h-4 auth-spinner" />
        ) : (
          <ArrowRight className="w-4 h-4" />
        )}
      </span>
    </button>
  );
}

export function AuthDivider() {
  return (
    <div className="auth-divider" aria-hidden="true">
      <i />
      <b>OR</b>
      <i />
    </div>
  );
}

interface GoogleAuthButtonProps {
  label: string;
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function GoogleAuthButton({
  label,
  loading,
  disabled = false,
  onClick,
}: GoogleAuthButtonProps) {
  return (
    <button
      type="button"
      className="auth-btn-google"
      onClick={onClick}
      disabled={loading || disabled}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 auth-spinner" aria-hidden="true" />
      ) : (
        <svg className="g-icon" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
        </svg>
      )}
      <span>{loading ? "Connecting to Google..." : label}</span>
    </button>
  );
}
