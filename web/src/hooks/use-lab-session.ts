import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import {
  apiErrorMessage,
  endSession as apiEndSession,
  getHistory,
  getSession,
  isApiError,
  launchSession,
} from "@/lib/api"
import { END_REASON_LABEL, formatUsd } from "@/lib/format"
import { hasFlag, setFlag } from "@/lib/storage"
import type { Session, Template, TemplateInterface } from "@/lib/types"

/** Poll every 2 s while a lab is starting (or ending), every 30 s otherwise (PLAN.md §8.1). */
const FAST_POLL_MS = 2_000
const SLOW_POLL_MS = 30_000
/** Past `expiresAt` the reaper ends the lab within a minute; check a bit more often. */
const EXPIRED_POLL_MS = 5_000

const ACTIVE_STATUSES = new Set<Session["status"]>(["starting", "running", "ending"])

export function isActiveSession(session: Session | null | undefined): session is Session {
  return !!session && ACTIVE_STATUSES.has(session.status)
}

/** A launch that didn't work out: a `failed` session or a `502 provision_failed`. */
export type LabFailure = {
  templateId: string
  templateName: string
  interface?: TemplateInterface
  message: string
  /** Set when the failure is a session (so it can be dismissed for good). */
  sessionId?: string
}

/** Inline catalog notice for launch errors that aren't the student's fault. */
export type LaunchNotice = {
  tone: "warning" | "danger"
  message: string
}

export type LaunchOutcome = "started" | "existing" | "failed"

const START_FAILED_MESSAGE = "The lab couldn't start. This is usually temporary, so try again."

const dismissedKey = (sessionId: string) => `teal.failed.dismissed.${sessionId}`

function endDescription(session: Session): string {
  const reason = session.endReason ? END_REASON_LABEL[session.endReason] : "Ended"
  return session.costUsd != null ? `${reason} · cost ${formatUsd(session.costUsd)}` : reason
}

/**
 * Owns the student's active lab: polling `GET /api/session`, launching,
 * ending, and turning API errors into UI state (PLAN.md §4.3, §9.1, §14 Phase 4).
 *
 * - `session` is `undefined` until the first response, then the active session or null.
 * - Polling pauses while the tab is hidden and refetches on focus / when it becomes visible.
 * - When an active lab disappears (ended on the lab page, expired, or failed while
 *   starting) the history is checked to tell the student what happened.
 */
export function useLabSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [failure, setFailure] = useState<LabFailure | null>(null)
  const [notice, setNotice] = useState<LaunchNotice | null>(null)
  const [pollError, setPollError] = useState<unknown>(null)
  const [launchingId, setLaunchingId] = useState<string | null>(null)
  /** Id of a session this tab watched go from starting → running (drives the "ready" animation). */
  const [readyId, setReadyId] = useState<string | null>(null)
  /** Bumped whenever Recent labs should refetch. */
  const [historyKey, setHistoryKey] = useState(0)
  const [pollTick, setPollTick] = useState(0)
  const [hidden, setHidden] = useState(() => document.visibilityState === "hidden")

  const sessionRef = useRef<Session | null | undefined>(undefined)
  /** Incremented on every local change so stale in-flight polls are ignored. */
  const epochRef = useRef(0)
  const inflightRef = useRef<AbortController | null>(null)
  const lastFetchRef = useRef(0)

  const commit = useCallback((next: Session | null) => {
    sessionRef.current = next
    setSession(next)
  }, [])

  const bumpHistory = useCallback(() => setHistoryKey((k) => k + 1), [])

  const showFailedSession = useCallback((failed: Session) => {
    if (hasFlag(dismissedKey(failed.id))) return
    setFailure((current) =>
      current?.sessionId === failed.id
        ? current
        : {
            sessionId: failed.id,
            templateId: failed.templateId,
            templateName: failed.templateName,
            interface: failed.interface,
            message: START_FAILED_MESSAGE,
          }
    )
  }, [])

  /** The active lab vanished from GET /api/session: find out why from the history. */
  const explainDisappeared = useCallback(
    async (previous: Session) => {
      bumpHistory()
      let found: Session | undefined
      try {
        found = (await getHistory()).find((s) => s.id === previous.id)
      } catch {
        // fall through with what we know
      }
      if (found?.status === "failed" || (!found && previous.status === "starting")) {
        showFailedSession(found ?? { ...previous, status: "failed" })
        return
      }
      toast.info(`${previous.templateName} has ended`, {
        id: `ended-${previous.id}`,
        description: found ? endDescription(found) : undefined,
      })
    },
    [bumpHistory, showFailedSession]
  )

  const applyFetched = useCallback(
    (next: Session | null) => {
      const previous = sessionRef.current

      if (next?.status === "failed") {
        commit(null)
        showFailedSession(next)
        if (isActiveSession(previous)) bumpHistory()
        return
      }

      if (isActiveSession(next)) {
        if (previous?.id === next.id && previous.status === "starting" && next.status === "running") {
          setReadyId(next.id)
          toast.success(`${next.templateName} is ready`, {
            id: `ready-${next.id}`,
            description: "Open it from the active lab card.",
          })
        }
        if (previous?.id !== next.id) setFailure(null)
        commit(next)
        return
      }

      commit(null)
      if (isActiveSession(previous)) void explainDisappeared(previous)
    },
    [bumpHistory, commit, explainDisappeared, showFailedSession]
  )

  const refresh = useCallback(async () => {
    inflightRef.current?.abort()
    const controller = new AbortController()
    inflightRef.current = controller
    const epoch = epochRef.current
    lastFetchRef.current = Date.now()
    try {
      const next = await getSession(controller.signal)
      if (controller.signal.aborted || epoch !== epochRef.current) return
      setPollError(null)
      applyFetched(next)
    } catch (error) {
      if (controller.signal.aborted || epoch !== epochRef.current) return
      setPollError(error)
    } finally {
      if (inflightRef.current === controller) {
        inflightRef.current = null
        setPollTick((t) => t + 1)
      }
    }
  }, [applyFetched])

  /** Replace the session from a local action (launch / 409 / end) and drop stale polls. */
  const takeSession = useCallback(
    (next: Session | null) => {
      epochRef.current += 1
      inflightRef.current?.abort()
      inflightRef.current = null
      commit(next)
      setPollError(null)
      setPollTick((t) => t + 1)
    },
    [commit]
  )

  // Poll loop: first load right away, then rescheduled after every response
  // and whenever the status changes.
  const status = session?.status
  const expiresAt = session?.expiresAt
  useEffect(() => {
    if (hidden) return
    let delay = status === "starting" || status === "ending" ? FAST_POLL_MS : SLOW_POLL_MS
    if (expiresAt && Date.parse(expiresAt) <= Date.now()) delay = Math.min(delay, EXPIRED_POLL_MS)
    if (pollTick === 0) delay = 0
    const timer = window.setTimeout(() => void refresh(), delay)
    return () => window.clearTimeout(timer)
  }, [hidden, status, expiresAt, pollTick, refresh])

  // Check right after the lab's time runs out.
  useEffect(() => {
    if (hidden || !expiresAt) return
    const ms = Date.parse(expiresAt) - Date.now() + 1500
    if (ms <= 0 || ms > 2 ** 31 - 1) return
    const timer = window.setTimeout(() => void refresh(), ms)
    return () => window.clearTimeout(timer)
  }, [hidden, expiresAt, refresh])

  // Pause while hidden; refetch on focus / when the tab comes back.
  useEffect(() => {
    const refetchIfStale = () => {
      if (Date.now() - lastFetchRef.current > 1000) void refresh()
    }
    const onVisibility = () => {
      const isHidden = document.visibilityState === "hidden"
      setHidden(isHidden)
      if (!isHidden) refetchIfStale()
    }
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("focus", refetchIfStale)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("focus", refetchIfStale)
      inflightRef.current?.abort()
    }
  }, [refresh])

  const launch = useCallback(
    async (template: Pick<Template, "id" | "name">, iface?: TemplateInterface): Promise<LaunchOutcome> => {
      setLaunchingId(template.id)
      setNotice(null)
      setFailure(null)
      try {
        const started = await launchSession(template.id, iface)
        takeSession(started)
        return "started"
      } catch (error) {
        if (isApiError(error, "active_session") && error.body?.session) {
          takeSession(error.body.session)
          toast.info("You already have a lab running", {
            description: `Showing ${error.body.session.templateName}. End it before launching another.`,
          })
          return "existing"
        }
        const message = apiErrorMessage(error)
        if (isApiError(error, "provision_failed")) {
          setFailure({ templateId: template.id, templateName: template.name, interface: iface, message })
          bumpHistory()
        } else if (isApiError(error, "launches_disabled")) {
          setNotice({ tone: "warning", message })
        } else if (isApiError(error, "capacity_full")) {
          setNotice({ tone: "warning", message })
        } else if (isApiError(error, "unknown_template") || isApiError(error, "unknown_interface")) {
          setNotice({ tone: "danger", message })
        } else {
          setNotice({ tone: "danger", message: `Couldn't launch ${template.name}. ${message}` })
        }
        // The failure card already says it; toast the rest (the notice may be off-screen on phones).
        if (!isApiError(error, "provision_failed")) toast.error(message, { id: "launch-error" })
        return "failed"
      } finally {
        setLaunchingId(null)
      }
    },
    [bumpHistory, takeSession]
  )

  /** Ends the active lab. Resolves true when the lab is gone. */
  const end = useCallback(async (): Promise<boolean> => {
    try {
      const ended = await apiEndSession()
      takeSession(null)
      bumpHistory()
      toast.success("Lab ended", {
        id: `ended-${ended.id}`,
        description: `${ended.templateName} cost ${formatUsd(ended.costUsd)}. Files were deleted.`,
      })
      return true
    } catch (error) {
      if (isApiError(error, "no_active_session")) {
        takeSession(null)
        bumpHistory()
        toast.info("This lab had already ended.")
        return true
      }
      toast.error(apiErrorMessage(error))
      return false
    }
  }, [bumpHistory, takeSession])

  const dismissFailure = useCallback(() => {
    if (failure?.sessionId) setFlag(dismissedKey(failure.sessionId))
    setFailure(null)
  }, [failure])

  const retryFailure = useCallback(async (): Promise<LaunchOutcome> => {
    if (!failure) return "failed"
    if (failure.sessionId) setFlag(dismissedKey(failure.sessionId))
    return launch({ id: failure.templateId, name: failure.templateName }, failure.interface)
  }, [failure, launch])

  return {
    session,
    failure,
    notice,
    pollError,
    launchingId,
    readyId,
    historyKey,
    refresh,
    launch,
    end,
    retryFailure,
    dismissFailure,
    dismissNotice: useCallback(() => setNotice(null), []),
  }
}
