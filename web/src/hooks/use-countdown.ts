import { useEffect, useState } from "react"

import { timeLevel, type TimeLevel } from "@/lib/status"

/** Current time, re-rendered every `intervalMs` (aligned to whole seconds). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    let timer: number
    const tick = () => {
      setNow(Date.now())
      timer = window.setTimeout(tick, intervalMs - (Date.now() % intervalMs))
    }
    timer = window.setTimeout(tick, intervalMs - (Date.now() % intervalMs))
    return () => window.clearTimeout(timer)
  }, [intervalMs])
  return now
}

/** Milliseconds left until `expiresAt` (RFC 3339 or epoch ms) and the timer level. */
export function useCountdown(expiresAt: string | number | undefined | null): {
  remainingMs: number
  level: TimeLevel
} {
  const now = useNow(1000)
  const target =
    expiresAt == null ? now : typeof expiresAt === "number" ? expiresAt : Date.parse(expiresAt)
  const remainingMs = Math.max(0, target - now)
  return { remainingMs, level: timeLevel(remainingMs) }
}
