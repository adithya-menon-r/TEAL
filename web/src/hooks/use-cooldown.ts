import { useCallback, useState } from "react"

import { useNow } from "@/hooks/use-countdown"

function readUntil(key: string): number {
  try {
    return Number(window.sessionStorage.getItem(key)) || 0
  } catch {
    return 0
  }
}

/**
 * A cooldown that survives refreshes (sessionStorage), e.g. the 60 s
 * "Resend email" limit. `start()` begins a new cooldown.
 */
export function useCooldown(key: string, seconds: number) {
  const [until, setUntil] = useState(() => readUntil(key))
  const now = useNow(1000)
  const remaining = Math.max(0, Math.ceil((until - now) / 1000))

  const start = useCallback(() => {
    const next = Date.now() + seconds * 1000
    setUntil(next)
    try {
      window.sessionStorage.setItem(key, String(next))
    } catch {
      // ignore
    }
  }, [key, seconds])

  return { remaining, active: remaining > 0, start }
}

/** Starts the resend cooldown from outside a component (e.g. right after sign-up). */
export function startCooldown(key: string, seconds: number) {
  try {
    window.sessionStorage.setItem(key, String(Date.now() + seconds * 1000))
  } catch {
    // ignore
  }
}

export const RESEND_COOLDOWN_KEY = "teal.verify.resendUntil"
export const RESEND_COOLDOWN_SECONDS = 60
