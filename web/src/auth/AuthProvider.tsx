import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"

import { loadAuthAdapter } from "@/auth/adapter"
import { AuthContext, type AuthContextValue } from "@/auth/context"
import type { AuthUser } from "@/auth/types"

/**
 * Holds the signed-in user (via onAuthStateChanged, or the mock equivalent)
 * and exposes the auth actions. `user.reload()` doesn't trigger
 * onAuthStateChanged, so `refresh()` pushes the fresh user into state itself.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    let cancelled = false
    loadAuthAdapter()
      .then((adapter) => {
        if (cancelled) return
        unsubscribe = adapter.onChange((next) => {
          setUser(next)
          setLoading(false)
        })
      })
      .catch((error: unknown) => {
        // Usually missing VITE_FIREBASE_* config; the app still renders signed out.
        console.error("[auth] could not start:", error)
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const next = await (await loadAuthAdapter()).signUp(email, password)
    setUser(next)
    return next
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const next = await (await loadAuthAdapter()).signIn(email, password)
    setUser(next)
    return next
  }, [])

  const signOut = useCallback(async () => {
    await (await loadAuthAdapter()).signOut()
    setUser(null)
  }, [])

  const resendVerification = useCallback(async () => {
    await (await loadAuthAdapter()).sendVerification()
  }, [])

  const sendPasswordReset = useCallback(async (email: string) => {
    await (await loadAuthAdapter()).sendPasswordReset(email)
  }, [])

  const refresh = useCallback(async () => {
    const next = await (await loadAuthAdapter()).refresh()
    setUser(next)
    return next
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signUp, signIn, signOut, resendVerification, sendPasswordReset, refresh }),
    [user, loading, signUp, signIn, signOut, resendVerification, sendPasswordReset, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
