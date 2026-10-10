import { ClockIcon, CpuIcon } from "lucide-react"

import { LabIcon } from "@/components/lab-icon"
import { SectionHeading } from "@/components/landing/section-heading"
import { Stagger, StaggerItem } from "@/components/motion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiResource } from "@/hooks/use-api-resource"
import { getTemplates } from "@/lib/api"
import { formatResources } from "@/lib/format"
import type { Template } from "@/lib/types"

const VISIBLE_TOOLS = 6

function LabCard({ lab }: { lab: Template }) {
  const extra = lab.tools.length - VISIBLE_TOOLS
  return (
    <Card variant="interactive" className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-11 place-items-center rounded-lg border bg-primary-soft text-primary-ink transition-[background-color,color] duration-200 ease-out group-hover/card:group-hover/card:bg-primary group-hover/card:text-primary-foreground">
            <LabIcon id={lab.id} className="size-5" />
          </span>
          <Badge variant={lab.interface === "jupyter" ? "accent" : lab.interface === "vscode" ? "default" : "outline"} mono>
            {lab.interface === "jupyter" ? "JupyterLab" : lab.interface === "vscode" ? "VS Code" : "Terminal"}
          </Badge>
        </div>
        <h3 className="mt-3 text-lg leading-snug font-bold tracking-tight">{lab.name}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{lab.description}</p>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="flex flex-wrap gap-1.5" aria-label="Installed tools">
          {lab.tools.slice(0, VISIBLE_TOOLS).map((tool) => (
            <li
              key={tool}
              className="rounded-sm border bg-popover px-2 py-0.5 font-mono text-[0.6875rem] text-foreground/85 transition-colors duration-150 group-hover/card:border-border-strong"
            >
              {tool}
            </li>
          ))}
          {extra > 0 && (
            <li className="rounded-sm px-1.5 py-0.5 font-mono text-[0.6875rem] text-muted-foreground">
              +{extra} more
            </li>
          )}
        </ul>
      </CardContent>
      <CardFooter className="justify-between gap-x-4 font-mono text-[0.75rem] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CpuIcon className="size-3.5" aria-hidden />
          {formatResources(lab)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ClockIcon className="size-3.5" aria-hidden />
          {lab.durationMinutes} min
        </span>
      </CardFooter>
    </Card>
  )
}

function LabCardSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 rounded-lg border bg-card p-5 shadow-xs">
      <div className="flex items-start justify-between">
        <Skeleton className="size-11 rounded-lg" />
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <div className="flex flex-1 flex-wrap content-start gap-1.5">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-10" />
      </div>
      <Skeleton className="h-4 w-full" />
    </div>
  )
}

export function LabsSection() {
  const { data: labs, error, loading, reload } = useApiResource(getTemplates)
  const failed = !loading && !labs && error !== undefined
  return (
    <section id="labs" className="border-t">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <SectionHeading
          eyebrow="Labs"
          title="Course tools, preinstalled"
          description={
            <>
              Each lab is its own container with the toolchain your course uses. Need a library?{" "}
              <code className="rounded-sm border bg-card px-1 py-0.5 whitespace-nowrap text-[0.8125rem] text-foreground">pip install --user</code>{" "}
              and <code className="rounded-sm border bg-card px-1 py-0.5 whitespace-nowrap text-[0.8125rem] text-foreground">cabal install</code> work too.
            </>
          }
        />
        {labs ? (
          <Stagger className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {labs.map((lab) => (
              <StaggerItem key={lab.id} className="h-full md:last:odd:col-span-2 lg:last:odd:col-span-1">
                <LabCard lab={lab} />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <div className="relative mt-12" aria-busy={!failed}>
            <div
              className={`grid gap-5 md:grid-cols-2 lg:grid-cols-3 ${failed ? "opacity-40" : ""}`}
              aria-label={failed ? undefined : "Loading labs"}
              aria-hidden={failed}
            >
              {[0, 1, 2].map((i) => (
                <LabCardSkeleton key={i} />
              ))}
            </div>
            {failed && (
              <div
                role="status"
                className="absolute inset-0 flex items-center justify-center gap-3 text-sm text-muted-foreground"
              >
                <span>Couldn&apos;t load labs right now.</span>
                <Button variant="outline" size="sm" onClick={reload}>
                  Retry
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
