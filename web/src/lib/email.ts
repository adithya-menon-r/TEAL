/**
 * Allowed student emails (PLAN.md §2). The backend applies the same regex
 * (`ALLOWED_EMAIL_REGEX`), so keep the two in sync.
 */
export const ALLOWED_EMAIL_REGEX = /^[^@\s]+@[a-z0-9-]+\.students\.amrita\.edu$/

export const EMAIL_DOMAIN_HINT = "roll_number@xx.students.amrita.edu"

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isAllowedEmail(email: string): boolean {
  return ALLOWED_EMAIL_REGEX.test(normalizeEmail(email))
}

/** Returns a user-facing error for an email field, or null if it is fine. */
export function emailError(email: string): string | null {
  const value = normalizeEmail(email)
  if (!value) return "Enter your Amrita student email."
  if (!value.includes("@")) return "That doesn't look like an email address."
  if (!isAllowedEmail(value)) {
    return `Use your Amrita student email, like ${EMAIL_DOMAIN_HINT}.`
  }
  return null
}

export {
  MIN_PASSWORD_LENGTH,
  PASSWORD_HINT,
  isStrongPassword,
  passwordError,
} from "./password"
