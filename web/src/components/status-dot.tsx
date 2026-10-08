import { cn } from "@/lib/utils"
import { SESSION_STATUS, type StatusTone } from "@/lib/status"
import type { SessionStatus } from "@/lib/types"

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-muted-foreground",
  primary: "bg-primary",
  accent: "bg-accent",
  warning: "bg-warning",
  danger: "bg-danger",
}

type StatusDotProps = {
  tone?: StatusTone
  /** Animated ping ring (disabled under prefers-reduced-motion). */
  pulse?: boolean
  /** Shortcut: derive tone + pulse from a session status. */
  status?: SessionStatus
  className?: string
  /** Accessible label; omit when the status is already written next to the dot. */
  label?: string
}

export function StatusDot({ tone, pulse, status, className, label }: StatusDotProps) {
  const preset = status ? SESSION_STATUS[status] : undefined
  const t = tone ?? preset?.tone ?? "neutral"
  const p = pulse ?? preset?.pulse ?? false
  return (
    <span
      className={cn("relative inline-flex size-2 shrink-0", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {p && (
        <span
          className={cn(
            "absolute inset-0 rounded-full animate-status-ping motion-reduce:hidden",
            TONE_CLASS[t]
          )}
        />
      )}
      <span className={cn("relative inline-flex size-full rounded-full", TONE_CLASS[t])} />
    </span>
  )
}

/** Dot + label pill, e.g. ● Running. */
export function StatusPill({
  status,
  className,
  children,
}: {
  status: SessionStatus
  className?: string
  children?: React.ReactNode
}) {
  const s = SESSION_STATUS[status]
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-2 rounded-full border bg-card px-2.5 font-mono text-[0.6875rem] font-medium tracking-[0.06em] text-foreground uppercase",
        className
      )}
    >
      <StatusDot status={status} />
      {children ?? s.label}
    </span>
  )
}
