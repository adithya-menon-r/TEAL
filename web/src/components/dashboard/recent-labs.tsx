import { AnimatePresence, motion } from "motion/react"
import { HistoryIcon } from "lucide-react"

import { LabIcon } from "@/components/lab-icon"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { END_REASON_LABEL, formatDateTime, formatDuration, formatUsd } from "@/lib/format"
import { transitions } from "@/lib/motion"
import type { EndReason, Session } from "@/lib/types"

const REASON_VARIANT: Record<EndReason, "muted" | "warning" | "outline" | "danger"> = {
  user: "muted",
  expired: "warning",
  deleted: "outline",
  failed: "danger",
}

function ReasonBadge({ session }: { session: Session }) {
  const reason: EndReason | undefined = session.endReason ?? (session.status === "failed" ? "failed" : undefined)
  if (!reason) return <Badge variant="muted">{session.status === "ended" ? "Ended" : session.status}</Badge>
  return <Badge variant={REASON_VARIANT[reason]}>{END_REASON_LABEL[reason]}</Badge>
}

const rowMotion = {
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0, transition: transitions.slow },
  exit: { opacity: 0, transition: transitions.fast },
}

/** Last 10 labs: a compact table on md+, stacked rows on phones. */
export function RecentLabs({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <Card variant="ghost" className="items-center px-6 py-10 text-center">
        <span className="grid size-10 place-items-center rounded-lg border bg-card text-muted-foreground">
          <HistoryIcon className="size-4.5" aria-hidden />
        </span>
        <div>
          <p className="font-semibold">No labs yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Labs you launch show up here with their duration and cost.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="gap-0 py-0">
      {/* md+ : table */}
      <table className="hidden w-full table-fixed text-sm md:table">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <Th className="w-[40%]">Lab</Th>
            <Th className="w-[19%]">Started</Th>
            <Th className="w-[13%]">Duration</Th>
            <Th className="w-[16%]">Reason</Th>
            <Th className="w-[12%] text-right">Cost</Th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {sessions.map((s) => (
              <motion.tr
                key={s.id}
                layout="position"
                {...rowMotion}
                className="border-b transition-colors duration-150 last:border-b-0 hover:bg-muted/35"
              >
                <td className="py-3 pr-4 pl-5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-md border bg-popover text-muted-foreground">
                      <LabIcon id={s.templateId} className="size-3.5" />
                    </span>
                    <span className="truncate font-medium" title={s.templateName}>
                      {s.templateName}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap text-muted-foreground">
                  {formatDateTime(s.createdAt)}
                </td>
                <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap text-muted-foreground">
                  {formatDuration(s.createdAt, s.endedAt)}
                </td>
                <td className="py-3 pr-4">
                  <ReasonBadge session={s} />
                </td>
                <td className="py-3 pr-5 text-right font-mono text-xs font-medium whitespace-nowrap tabular-nums">
                  {formatUsd(s.costUsd)}
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>

      {/* phones: stacked rows */}
      <ul className="divide-y md:hidden">
        <AnimatePresence initial={false}>
          {sessions.map((s) => (
            <motion.li key={s.id} layout="position" {...rowMotion} className="flex gap-3 px-4 py-3.5">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border bg-popover text-muted-foreground">
                <LabIcon id={s.templateId} className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 truncate font-medium">{s.templateName}</p>
                  <span className="shrink-0 font-mono text-xs font-medium tabular-nums">{formatUsd(s.costUsd)}</span>
                </div>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {formatDateTime(s.createdAt)} · {formatDuration(s.createdAt, s.endedAt)}
                </p>
                <div className="mt-2">
                  <ReasonBadge session={s} />
                </div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </Card>
  )
}

function Th({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <th scope="col" className={`py-2.5 pr-4 first:pl-5 last:pr-5 mono-label font-medium text-muted-foreground ${className}`}>
      {children}
    </th>
  )
}

export function RecentLabsSkeleton() {
  return (
    <Card className="gap-0 py-0" aria-busy="true" aria-label="Loading recent labs">
      <div className="border-b bg-muted/40 px-5 py-3">
        <Skeleton className="h-3 w-40" />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 border-b px-5 py-3.5 last:border-b-0">
          <Skeleton className="size-7" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="hidden h-3.5 w-24 md:block" />
          <Skeleton className="hidden h-5 w-24 md:block" />
          <Skeleton className="h-3.5 w-12" />
        </div>
      ))}
    </Card>
  )
}
