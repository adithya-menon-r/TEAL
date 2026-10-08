/**
 * Maps Firebase Auth error codes to short, friendly messages.
 * With email-enumeration protection on (PLAN.md §6.1), wrong email and wrong
 * password both arrive as `auth/invalid-credential`.
 */
const MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "An account with this email already exists. Try logging in instead.",
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/missing-email": "Enter your email address.",
  "auth/missing-password": "Enter your password.",
  "auth/weak-password": "Choose a stronger password (at least 8 characters, one uppercase letter, and one special symbol).",
  "auth/password-does-not-meet-requirements": "Choose a stronger password (at least 8 characters, one uppercase letter, and one special symbol).",
  "auth/invalid-credential": "Wrong email or password.",
  "auth/invalid-login-credentials": "Wrong email or password.",
  "auth/wrong-password": "Wrong email or password.",
  "auth/user-not-found": "Wrong email or password.",
  "auth/user-disabled": "This account has been disabled. Contact your lab instructor.",
  "auth/too-many-requests": "Too many attempts. Wait a minute and try again.",
  "auth/network-request-failed": "Can't reach the sign-in service. Check your connection and try again.",
  "auth/internal-error": "Something went wrong on our side. Try again in a moment.",
  "auth/operation-not-allowed": "Email sign-in isn't enabled for TEAL yet.",
  "auth/unauthorized-continue-uri": "This site isn't allowed to send verification emails yet.",
  "auth/invalid-continue-uri": "This site isn't allowed to send verification emails yet.",
  "auth/expired-action-code": "That link has expired. Request a new one.",
  "auth/invalid-action-code": "That link is invalid or was already used. Request a new one.",
  "auth/requires-recent-login": "Please log in again to continue.",
  "auth/no-current-user": "Your session ended. Please log in again.",
  "auth/user-token-expired": "Your session ended. Please log in again.",
  "auth/invalid-api-key": "TEAL sign-in isn't configured correctly.",
  "auth/configuration-not-found": "TEAL sign-in isn't configured correctly.",
  "app/not-configured": "TEAL sign-in isn't configured. Set the VITE_FIREBASE_* variables or run with VITE_MOCK=1.",
}

export function authErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code
  }
  return undefined
}

export function authErrorMessage(error: unknown): string {
  const code = authErrorCode(error)
  if (code && MESSAGES[code]) return MESSAGES[code]
  return "Something went wrong. Please try again."
}
