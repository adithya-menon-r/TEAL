export const MIN_PASSWORD_LENGTH = 8

export const PASSWORD_HINT = "At least 8 characters, one uppercase letter, and one special symbol."

/**
 * Validates password complexity:
 * - At least 8 characters
 * - At least one uppercase letter (caps)
 * - At least one special symbol (non-alphanumeric, non-whitespace character)
 */
export function isStrongPassword(password: string): boolean {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    /[A-Z]/.test(password) &&
    /[^A-Za-z0-9\s]/.test(password)
  )
}

/** Returns a user-facing error for a password field, or null if valid. */
export function passwordError(password: string): string | null {
  if (!password) return "Enter a password."
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  const hasUpper = /[A-Z]/.test(password)
  const hasSymbol = /[^A-Za-z0-9\s]/.test(password)

  if (!hasUpper && !hasSymbol) {
    return "Include at least one uppercase letter and one special symbol."
  }
  if (!hasUpper) {
    return "Include at least one uppercase letter."
  }
  if (!hasSymbol) {
    return "Include at least one special symbol."
  }
  return null
}
