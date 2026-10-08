import { OctagonAlertIcon, RotateCwIcon } from "lucide-react"

import { MonoLabel } from "@/components/mono-label"
import { Button } from "@/components/ui/button"
import { Card, CardHeader } from "@/components/ui/card"
import type { LabFailure } from "@/hooks/use-lab-session"

/** Shown when a launch fails (502 provision_failed, or a session that turned `failed`). */
export function FailureCard({
  failure,
  retrying,
  disabled,
  onRetry,
  onDismiss,
}: {
  failure: LabFailure
  retrying: boolean
  disabled: boolean
  onRetry: () => void
  onDismiss: () => void
}) {
  return (
    <Card className="border-danger/35 bg-[color-mix(in_oklab,var(--danger-soft)_45%,var(--card))]" role="alert">
      <CardHeader>
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-danger/25 bg-danger-soft text-danger">
            <OctagonAlertIcon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 basis-56">
            <MonoLabel className="text-danger">Launch failed</MonoLabel>
            <h2 className="mt-1.5 text-lg leading-snug font-bold tracking-tight">
              {failure.templateName} didn't start
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{failure.message}</p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto sm:self-center">
            <Button variant="ghost" onClick={onDismiss} disabled={retrying} className="flex-1 sm:flex-none">
              Dismiss
            </Button>
            <Button onClick={onRetry} loading={retrying} disabled={disabled} className="flex-1 sm:flex-none">
              <RotateCwIcon />
              Retry
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}
