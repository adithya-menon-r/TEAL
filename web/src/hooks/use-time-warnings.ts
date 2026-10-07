import { useEffect } from "react"
import { toast } from "sonner"

import { useCountdown } from "@/hooks/use-countdown"
import { DANGER_MS, WARNING_MS } from "@/lib/status"
import { hasFlag, setFlag } from "@/lib/storage"
import type { Session } from "@/lib/types"

const flagKey = (sessionId: string, mark: "10" | "2") => `teal.toast.${sessionId}.${mark}`

/**
 * One toast when a lab crosses 10 min left and one at 2 min left (PLAN.md §4.4).
 * Each fires at most once per session; the flags live in sessionStorage so a
 * re-render or refresh doesn't repeat them. If the page opens past a mark
 * (e.g. 5 min left) the toast shows the real time left.
 */
export function useTimeWarnings(session: Session | null) {
  const { level } = useCountdown(session?.expiresAt)
  const id = session?.id
  const expiresAt = session?.expiresAt
  const name = session?.templateName
  const live = session?.status === "starting" || session?.status === "running"

  useEffect(() => {
    if (!id || !expiresAt || !live) return
    const remaining = Date.parse(expiresAt) - Date.now()
    if (remaining <= 0 || remaining > WARNING_MS) return
    const minutes = Math.max(1, Math.ceil(remaining / 60_000))
    const left = `${minutes} minute${minutes === 1 ? "" : "s"} left`

    if (remaining <= DANGER_MS) {
      if (hasFlag(flagKey(id, "2"))) return
      setFlag(flagKey(id, "2"))
      setFlag(flagKey(id, "10"))
      toast.error(`${left} in ${name}`, {
        id: flagKey(id, "2"),
        description: "Download anything you need now. Files are deleted when the lab ends.",
        duration: 10_000,
      })
      return
    }

    if (hasFlag(flagKey(id, "10"))) return
    setFlag(flagKey(id, "10"))
    toast.warning(`${left} in ${name}`, {
      id: flagKey(id, "10"),
      description: "Save your work. Files are deleted when the lab ends.",
      duration: 8_000,
    })
  }, [id, expiresAt, name, live, level])
}
