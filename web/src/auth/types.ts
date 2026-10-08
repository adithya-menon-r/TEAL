/** The slice of the signed-in user the UI needs (Firebase or mock). */
export type AuthUser = {
  uid: string
  email: string
  emailVerified: boolean
}

/**
 * Everything the app needs from an auth provider. Implemented by Firebase
 * (src/auth/firebase-adapter.ts) and by the in-memory mock (src/lib/mock/auth.ts).
 * Errors should carry a Firebase-style `code` (e.g. "auth/invalid-credential")
 * so src/lib/auth-errors.ts can map them to friendly messages.
 */
export interface AuthAdapter {
  /** Subscribe to sign-in state. Fires once asynchronously with the current user. */
  onChange(callback: (user: AuthUser | null) => void): () => void
  /** Create the account, then send the verification email. */
  signUp(email: string, password: string): Promise<AuthUser>
  signIn(email: string, password: string): Promise<AuthUser>
  signOut(): Promise<void>
  /** Re-send the verification email to the current user. */
  sendVerification(): Promise<void>
  sendPasswordReset(email: string): Promise<void>
  /** `user.reload()` + `getIdToken(true)`; returns the fresh user. */
  refresh(): Promise<AuthUser | null>
  /** Current ID token (cached and auto-refreshed by Firebase), or null if signed out. */
  getIdToken(): Promise<string | null>
}
