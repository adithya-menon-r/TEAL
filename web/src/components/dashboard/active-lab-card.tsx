import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ArrowUpRightIcon, Loader2Icon, PowerIcon, TriangleAlertIcon } from "lucide-react"

import { Countdown } from "@/components/countdown"
import { LaunchSteps } from "@/components/dashboard/launch-steps"
import { InterfaceBadge } from "@/components/interface-badge"
import { LabIcon } from "@/components/lab-icon"
import { StatusPill } from "@/components/status-dot"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { useTimeWarnings } from "@/hooks/use-time-warnings"
import { formatResources, formatTime } from "@/lib/format"
import { transitions } from "@/lib/motion"
import type { Session, Template } from "@/lib/types"
import { cn } from "@/lib/utils"

/** How long the completed steps stay on screen after a lab becomes ready. */
const READY_STEPS_MS = 4_000

type ActiveLabCardProps = {
  session: Session
  /** Catalog entry for the session (for resources); may still be loading. */
  template?: Template
  /** This tab watched the lab go from starting → running. */
  justReady: boolean
  /** Move focus to the card (after a launch or a 409). */
  focusRequested: boolean
  onFocusHandled: () => void
  onEnd: () => Promise<boolean>
  /** Called after the lab is ended from the dialog, to place focus elsewhere. */
  onEnded: () => void
}

/**
 * The student's current lab: name, status, live countdown, Open Lab / End Lab.
 * While `starting` it shows the launch steps; Open Lab appears (with a small
 * success pulse) only once the lab is `running`, and only opens on click so
 * popup blockers never get in the way.
 */
export function ActiveLabCard({
  session,
  template,
  justReady,
  focusRequested,
  onFocusHandled,
  onEnd,
  onEnded,
}: ActiveLabCardProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [showReadySteps, setShowReadySteps] = useState(justReady)
  const [prevJustReady, setPrevJustReady] = useState(justReady)
  if (justReady !== prevJustReady) {
    setPrevJustReady(justReady)
    if (justReady) setShowReadySteps(true)
  }

  useTimeWarnings(session)

  useEffect(() => {
    if (!showReadySteps) return
    const timer = window.setTimeout(() => setShowReadySteps(false), READY_STEPS_MS)
    return () => window.clearTimeout(timer)
  }, [showReadySteps])

  useEffect(() => {
    if (!focusRequested) return
    const el = headingRef.current
    if (el) {
      el.focus({ preventScroll: true })
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      el.closest("[data-slot=card]")?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" })
    }
    onFocusHandled()
  }, [focusRequested, onFocusHandled])

  const starting = session.status === "starting"
  const running = session.status === "running"
  const ending = session.status === "ending"
  const showSteps = starting || (running && showReadySteps)

  function openLab() {
    if (session.accessUrl) window.open(session.accessUrl, "_blank", "noopener")
  }

  return (
    <Card
      variant="default"
      className="transition-[box-shadow,border-color] duration-200 ease-out hover:border-primary/45 hover:shadow-md"
      aria-labelledby="active-lab-title"
      role="region"
    >
      <CardHeader>
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary-soft text-primary-ink">
            <LabIcon id={session.templateId} className="size-5" />
          </span>
          <div className="min-w-0 flex-1 basis-56">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="active-lab-title"
                ref={headingRef}
                tabIndex={-1}
                className="w-fit max-w-full rounded-sm text-lg leading-snug font-bold tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
              >
                {session.templateName}
              </h2>
              {session.interface && <InterfaceBadge interface={session.interface} />}
              <StatusPill status={session.status} />
            </div>
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
              <span>Started {formatTime(session.createdAt)}</span>
              <span>Ends {formatTime(session.expiresAt)}</span>
              {template && <span>{formatResources(template)}</span>}
            </p>
          </div>
          <Countdown expiresAt={session.expiresAt} className="h-8 px-3 text-sm" />
        </div>
      </CardHeader>

      <AnimatePresence initial={false}>
        {(showSteps || ending) && (
          <motion.div
            key={ending ? "ending" : "steps"}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto", transition: transitions.slow }}
            exit={{ opacity: 0, height: 0, transition: transitions.base }}
            className="overflow-hidden"
          >
            <CardContent>
              {ending ? (
                <p className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground" role="status">
                  <Loader2Icon className="size-4 animate-spin text-primary" aria-hidden />
                  Ending your lab and deleting its files…
                </p>
              ) : (
                <div className="rounded-md border bg-popover/70 p-4">
                  <p className="mb-4 text-sm font-semibold" role="status">
                    {starting ? "Starting your lab…" : "Your lab is ready."}
                  </p>
                  <LaunchSteps session={session} />
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>

      <CardFooter className="flex-wrap justify-between gap-x-4 gap-y-3">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TriangleAlertIcon className="size-3.5 shrink-0 text-warning" aria-hidden />
          Files are deleted when the lab ends.
        </p>
        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <EndLabButton
            session={session}
            disabled={ending}
            onEnd={onEnd}
            onEnded={onEnded}
            className="flex-1 sm:flex-none"
          />
          <AnimatePresence initial={false}>
            {running && session.accessUrl && (
              <motion.div
                key="open"
                initial={{ opacity: 0, scale: 0.9, x: 6 }}
                animate={{ opacity: 1, scale: 1, x: 0, transition: transitions.slow }}
                exit={{ opacity: 0, scale: 0.95, transition: transitions.fast }}
                className="flex-1 sm:flex-none"
              >
                <Button
                  onClick={openLab}
                  className={cn("group/open w-full", justReady && "rounded-md animate-ready-ring")}
                >
                  Open Lab
                  <ArrowUpRightIcon className="transition-transform duration-150 ease-out group-hover/open:translate-x-0.5 group-hover/open:-translate-y-0.5" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardFooter>
    </Card>
  )
}

function EndLabButton({
  session,
  disabled,
  onEnd,
  onEnded,
  className,
}: {
  session: Session
  disabled: boolean
  onEnd: () => Promise<boolean>
  onEnded: () => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const endedRef = useRef(false)

  async function confirm() {
    setBusy(true)
    const ok = await onEnd()
    setBusy(false)
    if (ok) {
      endedRef.current = true
      setOpen(false)
      onEnded()
    }
  }

  const starting = session.status === "starting"

  return (
    <AlertDialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive-outline" disabled={disabled} className={className}>
          <PowerIcon />
          End Lab
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          // The card is going away; the dashboard moves focus somewhere sensible.
          if (endedRef.current) event.preventDefault()
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>End {session.templateName}?</AlertDialogTitle>
          <AlertDialogDescription>
            {starting
              ? "The lab is still starting. Ending it now cancels the launch."
              : "The lab is deleted right away, along with every file in it. Download anything you need first."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Keep working</AlertDialogCancel>
          <Button variant="destructive" loading={busy} onClick={confirm}>
            End Lab
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
