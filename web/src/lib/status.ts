import type { SessionStatus } from "@/lib/types"

export type StatusTone = "neutral" | "primary" | "accent" | "warning" | "danger"

/** Tone, pulse and label for each lab session status. */
export const SESSION_STATUS: Record<
  SessionStatus,
  { tone: StatusTone; pulse: boolean; label: string }
> = {
  starting: { tone: "accent", pulse: true, label: "Starting" },
  running: { tone: "primary", pulse: true, label: "Running" },
  ending: { tone: "warning", pulse: true, label: "Ending" },
  ended: { tone: "neutral", pulse: false, label: "Ended" },
  failed: { tone: "danger", pulse: false, label: "Failed" },
}

/** Lab countdown thresholds (PLAN.md §2): amber at ≤ 10 min, red at ≤ 2 min. */
export const WARNING_MS = 10 * 60 * 1000
export const DANGER_MS = 2 * 60 * 1000

export type TimeLevel = "normal" | "warning" | "danger" | "expired"

export function timeLevel(remainingMs: number): TimeLevel {
  if (remainingMs <= 0) return "expired"
  if (remainingMs <= DANGER_MS) return "danger"
  if (remainingMs <= WARNING_MS) return "warning"
  return "normal"
}
