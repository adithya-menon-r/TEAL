import { useEffect, useState } from "react"
import { BoxesIcon } from "lucide-react"

import { useAuth } from "@/auth/context"
import { FadeIn, Stagger, StaggerItem } from "@/components/motion"
import { MonoLabel } from "@/components/mono-label"
import { StatusDot } from "@/components/status-dot"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { apiErrorMessage, getMe } from "@/lib/api"
import { isMock } from "@/lib/env"

type ApiCheck = { state: "loading" } | { state: "ok" } | { state: "error"; message: string }

/** Small live check that the API layer + token plumbing work. */
function ApiStatus() {
  const [check, setCheck] = useState<ApiCheck>({ state: "loading" })

  useEffect(() => {
    const controller = new AbortController()
    getMe(controller.signal)
      .then(() => setCheck({ state: "ok" }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setCheck({ state: "error", message: apiErrorMessage(error) })
      })
    return () => controller.abort()
  }, [])

  return (
    <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs">
      {check.state === "loading" && (
        <>
          <StatusDot tone="neutral" pulse />
          <span className="text-muted-foreground">Connecting to teal-api…</span>
        </>
      )}
      {check.state === "ok" && (
        <>
          <StatusDot tone="primary" />
          <span className="text-foreground">
            API connected{isMock && <span className="text-muted-foreground"> (mock)</span>}
          </span>
        </>
      )}
      {check.state === "error" && (
        <>
          <StatusDot tone="danger" />
          <span className="text-danger">{check.message}</span>
        </>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const name = user?.email.split("@")[0] ?? "there"

  return (
    <div className="flex flex-col gap-8">
      <FadeIn className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <MonoLabel>Dashboard</MonoLabel>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-[1.75rem]">
            Hi, <span className="text-primary-ink">{name}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a lab to start a fresh 60-minute environment in your browser.
          </p>
        </div>
        <ApiStatus />
      </FadeIn>

      <FadeIn delay={0.05}>
        <Card variant="ghost" className="bg-card/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-md border bg-card text-primary-ink">
                <BoxesIcon className="size-4.5" />
              </span>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Lab catalog
                  <Badge variant="accent" mono>
                    Coming next
                  </Badge>
                </CardTitle>
                <CardDescription>
                  The catalog, launch flow, active lab card and recent labs land here next.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Stagger inView={false} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <StaggerItem key={i}>
                  <div className="flex flex-col gap-3 rounded-lg border bg-card p-5">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <div className="mt-2 flex gap-2">
                      <Skeleton className="h-6 w-14" />
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                    <Skeleton className="mt-2 h-9 w-full" />
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  )
}
