import { createContext, useContext } from "react"

import type { AuthUser } from "@/auth/types"

export type AuthContextValue = {
  user: AuthUser | null
  /** True until the first auth state is known. */
  loading: boolean
  signUp(email: string, password: string): Promise<AuthUser>
  signIn(email: string, password: string): Promise<AuthUser>
  signOut(): Promise<void>
  resendVerification(): Promise<void>
  sendPasswordReset(email: string): Promise<void>
  /** `user.reload()` + `getIdToken(true)`; updates `user` and returns it. */
  refresh(): Promise<AuthUser | null>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
