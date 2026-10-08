import { AnimatePresence, motion } from "motion/react"
import { CheckIcon, Loader2Icon } from "lucide-react"

import { useNow } from "@/hooks/use-countdown"
import { formatCountdown } from "@/lib/format"
import { transitions } from "@/lib/motion"
import type { Session } from "@/lib/types"
import { cn } from "@/lib/utils"

const STEPS = [
  { label: "Creating", hint: "Reserving your container" },
  { label: "Starting container", hint: "Booting the tools" },
  { label: "Ready", hint: "Opens in a new tab" },
] as const

/** The backend doesn't report sub-steps, so "Creating" is shown for the first few seconds. */
const CREATING_MS = 3_500

type StepState = "done" | "active" | "pending"

/**
 * Derived launch progress: *Creating → Starting container → Ready*, from the
 * time since `createdAt` and the session status (finishes on `running`).
 */
export function LaunchSteps({ session, className }: { session: Session; className?: string }) {
  const now = useNow(1000)
  const ready = session.status === "running"
  const elapsed = Math.max(0, now - Date.parse(session.createdAt))
  const current = ready ? STEPS.length : elapsed < CREATING_MS ? 0 : 1
  // Eases towards ~90% over a typical 20–60 s start, then jumps to 100% when ready.
  const progress = ready ? 1 : Math.min(0.9, 0.08 + 0.82 * (1 - Math.exp(-elapsed / 15_000)))

  const stateOf = (i: number): StepState => (i < current ? "done" : i === current ? "active" : "pending")

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <ol className="relative grid gap-3 sm:grid-cols-3 sm:gap-0" aria-label="Launch progress">
        <span aria-hidden className="absolute top-3 right-[8.3333%] left-[8.3333%] hidden h-px bg-border sm:block" />
        <span
          aria-hidden
          className="absolute top-3 left-3 hidden h-px bg-primary transition-[width] duration-300 ease-out sm:block"
          style={{ width: `${progress * 83.3333}%`, left: "8.3333%" }}
        />
        {STEPS.map((step, i) => {
          const state = stateOf(i)
          return (
            <li
              key={step.label}
              className={cn(
                "relative z-10 flex items-center gap-3 sm:flex-col sm:items-center sm:gap-2.5 sm:text-center",
                i === 0 && "sm:-translate-x-1/4",
                i === STEPS.length - 1 && "sm:translate-x-1/4",
              )}
              aria-current={state === "active" ? "step" : undefined}
            >
              <StepIndicator state={state} index={i} />
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm font-semibold transition-colors duration-200",
                    state === "pending" ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  {step.label}
                  <span className="sr-only">
                    {state === "done" ? " (done)" : state === "active" ? " (in progress)" : ""}
                  </span>
                </p>
                <p className="font-mono text-[0.6875rem] text-muted-foreground">{step.hint}</p>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="flex flex-col gap-2">
        <div
          className="relative h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Lab start progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div
            className={cn(
              "h-full rounded-full bg-primary ease-out",
              ready ? "transition-[width] duration-300" : "transition-[width] duration-1000"
            )}
            style={{ width: `${progress * 100}%` }}
          />
          {!ready && (
            <div aria-hidden className="absolute inset-0 animate-shimmer bg-[linear-gradient(90deg,transparent_0%,color-mix(in_oklab,var(--card)_55%,transparent)_50%,transparent_100%)] bg-size-[200%_100%] bg-no-repeat motion-reduce:hidden" />
          )}
        </div>
        <div className="flex items-center justify-between gap-3 font-mono text-[0.6875rem] text-muted-foreground">
          <span>{ready ? "Your lab is up" : "Usually 20–60 s"}</span>
          <span className="tabular-nums">
            {ready ? "Ready" : `${formatCountdown(elapsed)} elapsed`}
          </span>
        </div>
      </div>
    </div>
  )
}

function StepIndicator({ state, index }: { state: StepState; index: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative z-10 grid size-6 shrink-0 place-items-center rounded-full border text-[0.6875rem] font-semibold transition-colors duration-200",
        state === "done" && "border-primary bg-primary text-primary-foreground",
        state === "active" && "border-primary bg-primary-soft text-primary-ink",
        state === "pending" && "border-dashed border-border-strong bg-card text-muted-foreground"
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {state === "done" ? (
          <motion.span
            key="done"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transitions.base}
            className="grid place-items-center"
          >
            <CheckIcon className="size-3.5" strokeWidth={3} />
          </motion.span>
        ) : state === "active" ? (
          <motion.span key="active" exit={{ opacity: 0 }} transition={transitions.fast} className="grid place-items-center">
            <Loader2Icon className="size-3.5 animate-spin" />
          </motion.span>
        ) : (
          <motion.span key="pending" exit={{ opacity: 0 }} transition={transitions.fast}>
            {index + 1}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
