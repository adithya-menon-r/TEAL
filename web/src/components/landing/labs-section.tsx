import { BrainCircuitIcon, ClockIcon, CpuIcon, LambdaIcon, SquareTerminalIcon, type LucideIcon } from "lucide-react"

import { SectionHeading } from "@/components/landing/section-heading"
import { Stagger, StaggerItem } from "@/components/motion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { LAB_CATALOG } from "@/lib/catalog"
import { formatResources, formatUsd } from "@/lib/format"
import type { Template } from "@/lib/types"

const LAB_ICON: Record<string, LucideIcon> = {
  linux: SquareTerminalIcon,
  pfl: LambdaIcon,
  nndl: BrainCircuitIcon,
}

const VISIBLE_TOOLS = 6

function LabCard({ lab }: { lab: Template }) {
  const Icon = LAB_ICON[lab.id] ?? SquareTerminalIcon
  const extra = lab.tools.length - VISIBLE_TOOLS
  return (
    <Card variant="interactive" className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-11 place-items-center rounded-lg border bg-primary-soft text-primary-ink transition-[transform,background-color,color] duration-200 ease-out group-hover/card:-rotate-3 group-hover/card:bg-primary group-hover/card:text-primary-foreground">
            <Icon className="size-5" />
          </span>
          <Badge variant={lab.interface === "jupyter" ? "accent" : "outline"} mono>
            {lab.interface === "jupyter" ? "JupyterLab" : "Terminal"}
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
      <CardFooter className="flex-wrap justify-between gap-x-4 gap-y-1 font-mono text-[0.75rem] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CpuIcon className="size-3.5" aria-hidden />
          {formatResources(lab)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ClockIcon className="size-3.5" aria-hidden />
          {lab.durationMinutes} min
        </span>
        <span title="Approximate cloud cost per lab">≈ {formatUsd(lab.approxCostUsd)}</span>
      </CardFooter>
    </Card>
  )
}

export function LabsSection() {
  return (
    <section id="labs" className="border-t">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <SectionHeading
          eyebrow="Labs"
          title="Course tools, preinstalled"
          description={
            <>
              Each lab is its own container with the toolchain your course uses. Need a library?{" "}
              <code className="rounded-sm border bg-card px-1 py-0.5 text-[0.8125rem] text-foreground">pip install --user</code>{" "}
              and <code className="rounded-sm border bg-card px-1 py-0.5 text-[0.8125rem] text-foreground">cabal install</code> work too.
            </>
          }
        />
        <Stagger className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {LAB_CATALOG.map((lab) => (
            <StaggerItem key={lab.id} className="h-full md:last:col-span-2 lg:last:col-span-1">
              <LabCard lab={lab} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
