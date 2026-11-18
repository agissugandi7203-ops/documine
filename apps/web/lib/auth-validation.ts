export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const USERNAME_REGEX = /^[\p{L}\p{N} ._-]{2,40}$/u;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmailFormat(email: string): string | null {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return "Email address is required.";
  }
  if (normalized.length > 254 || normalized.includes("..")) {
    return "Please enter a valid email address.";
  }
  const [local, domain] = normalized.split("@");
  if (!local || !domain || local.length > 64 || !EMAIL_REGEX.test(normalized)) {
    return "Please enter a valid email address.";
  }
  const tld = domain.split(".").pop() ?? "";
  if (tld.length < 2 || /^\d+$/.test(tld)) {
    return "Please enter a valid email address.";
  }
  return null;
}

export function validateUsername(username: string): string | null {
  const trimmed = username.trim();
  if (!trimmed) {
    return "Username is required.";
  }
  if (trimmed.length < 2) {
    return "Username must be at least 2 characters.";
  }
  if (trimmed.length > 40) {
    return "Username must be 40 characters or fewer.";
  }
  if (!USERNAME_REGEX.test(trimmed)) {
    return "Username may only contain letters, numbers, spaces, dots, hyphens, and underscores.";
  }
  return null;
}

export function validatePasswordPolicy(password: string): string | null {
  if (!password) {
    return "Password is required.";
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`;
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }
  return null;
}

export function validatePasswordMatch(
  password: string,
  confirmPassword: string
): string | null {
  if (!confirmPassword) {
    return "Please confirm your password.";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }
  return null;
}

export function sanitizeRedirectPath(
  nextPath: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!nextPath) return fallback;
  const trimmed = nextPath.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\")
  ) {
    return fallback;
  }
  return trimmed;
}

export type PasswordStrengthTone = "neutral" | "weak" | "fair" | "good" | "strong";

export interface PasswordRequirementItem {
  key: "minLength" | "lowercase" | "uppercase" | "number";
  label: string;
  shortMissing: string;
  met: boolean;
}

export interface PasswordStrengthResult {
  score: number; // 0 to 4 core rules
  percent: number; // 0 to 100
  tone: PasswordStrengthTone;
  label: string;
  requirements: PasswordRequirementItem[];
  missingLabels: string[];
  allCoreMet: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const requirements: PasswordRequirementItem[] = [
    {
      key: "minLength",
      label: `${PASSWORD_MIN_LENGTH}+ characters`,
      shortMissing: `${PASSWORD_MIN_LENGTH}+ chars`,
      met: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      key: "lowercase",
      label: "1 lowercase (a-z)",
      shortMissing: "1 lowercase",
      met: /[a-z]/.test(password),
    },
    {
      key: "uppercase",
      label: "1 uppercase (A-Z)",
      shortMissing: "1 uppercase",
      met: /[A-Z]/.test(password),
    },
    {
      key: "number",
      label: "1 number (0-9)",
      shortMissing: "1 number",
      met: /[0-9]/.test(password),
    },
  ];

  if (!password) {
    return {
      score: 0,
      percent: 0,
      tone: "neutral",
      label: "Not set",
      requirements,
      missingLabels: requirements.map((r) => r.shortMissing),
      allCoreMet: false,
    };
  }

  const metCount = requirements.filter((r) => r.met).length;
  const missingLabels = requirements.filter((r) => !r.met).map((r) => r.shortMissing);
  const allCoreMet = metCount === requirements.length;
  const hasBonus = password.length >= 12 || /[^a-zA-Z0-9]/.test(password);

  if (metCount <= 1) {
    return {
      score: metCount,
      percent: 25,
      tone: "weak",
      label: "Weak",
      requirements,
      missingLabels,
      allCoreMet: false,
    };
  }

  if (metCount === 2) {
    return {
      score: metCount,
      percent: 50,
      tone: "fair",
      label: "Fair",
      requirements,
      missingLabels,
      allCoreMet: false,
    };
  }

  if (metCount === 3) {
    return {
      score: metCount,
      percent: 75,
      tone: "fair",
      label: "Almost there",
      requirements,
      missingLabels,
      allCoreMet: false,
    };
  }

  return {
    score: 4,
    percent: hasBonus ? 100 : 90,
    tone: hasBonus ? "strong" : "good",
    label: hasBonus ? "Very strong" : "Strong",
    requirements,
    missingLabels: [],
    allCoreMet,
  };
}
