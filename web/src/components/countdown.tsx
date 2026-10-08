import { TimerIcon } from "lucide-react"

import { useCountdown } from "@/hooks/use-countdown"
import { formatCountdown } from "@/lib/format"
import type { TimeLevel } from "@/lib/status"
import { cn } from "@/lib/utils"

const LEVEL_CLASS: Record<TimeLevel, string> = {
  normal: "border-border bg-card text-foreground",
  warning: "border-warning/30 bg-warning-soft text-warning",
  danger: "border-danger/30 bg-danger-soft text-danger",
  expired: "border-border bg-muted text-muted-foreground",
}

type CountdownProps = {
  expiresAt: string | number
  className?: string
  /** Text after the time, e.g. "left". */
  suffix?: string
  showIcon?: boolean
}

/**
 * Live lab countdown pill in monospace. Turns amber at ≤ 10 min and red at
 * ≤ 2 min (PLAN.md §2). Colour changes are transitioned.
 */
export function Countdown({ expiresAt, className, suffix = "left", showIcon = true }: CountdownProps) {
  const { remainingMs, level } = useCountdown(expiresAt)
  return (
    <span
      role="timer"
      aria-live="off"
      data-level={level}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 font-mono text-xs font-medium tabular-nums",
        "transition-colors duration-300 ease-out",
        LEVEL_CLASS[level],
        className
      )}
    >
      {showIcon && <TimerIcon className="size-3.5" aria-hidden />}
      {level === "expired" ? "Time's up" : formatCountdown(remainingMs)}
      {level !== "expired" && suffix && (
        <span className="font-sans text-[0.75rem] font-medium opacity-80">{suffix}</span>
      )}
    </span>
  )
}
