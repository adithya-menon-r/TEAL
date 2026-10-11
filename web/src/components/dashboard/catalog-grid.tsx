import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { ArrowRightIcon, ClockIcon, CodeXmlIcon, CpuIcon, NotebookIcon, RocketIcon, SquareTerminalIcon, WalletIcon } from "lucide-react"
import { motion } from "motion/react"

import { LabIcon } from "@/components/lab-icon"
import { Stagger, StaggerItem } from "@/components/motion"
import { StatusDot } from "@/components/status-dot"
import { InterfaceBadge } from "@/components/interface-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { formatResources, formatUsd, interfaceLabel } from "@/lib/format"
import type { Template, TemplateInterface } from "@/lib/types"

const VISIBLE_TOOLS = 5

type CatalogGridProps = {
  templates: Template[]
  /** Template id of the student's active lab, if any (Launch is disabled everywhere). */
  activeTemplateId?: string
  /** True while any lab is active or the session is still loading. */
  launchBlocked: boolean
  /** Why Launch is disabled, shown as a tooltip. */
  blockedReason?: string
  launchingId: string | null
  onLaunch: (template: Template, iface: TemplateInterface) => void
}

export function CatalogGrid({
  templates,
  activeTemplateId,
  launchBlocked,
  blockedReason,
  launchingId,
  onLaunch,
}: CatalogGridProps) {
  return (
    <Stagger inView={false} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((t) => (
        <StaggerItem key={t.id} className="h-full md:last:odd:col-span-2 lg:last:odd:col-span-1">
          <LabCard
            template={t}
            active={t.id === activeTemplateId}
            blocked={launchBlocked || (launchingId !== null && launchingId !== t.id)}
            blockedReason={launchBlocked ? blockedReason : undefined}
            launching={launchingId === t.id}
            onLaunch={(iface) => onLaunch(t, iface)}
          />
        </StaggerItem>
      ))}
    </Stagger>
  )
}

function LabCard({
  template,
  active,
  blocked,
  blockedReason,
  launching,
  onLaunch,
}: {
  template: Template
  active: boolean
  blocked: boolean
  blockedReason?: string
  launching: boolean
  onLaunch: (iface: TemplateInterface) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [iface, setIface] = useInterfaceChoice(template)
  const multi = template.interfaces.length > 1
  const extra = template.tools.length - VISIBLE_TOOLS
  const tools = expanded ? template.tools : template.tools.slice(0, VISIBLE_TOOLS)
  const toolsId = `tools-${template.id}`

  // A loading button is disabled, which drops keyboard focus. If the launch
  // didn't produce a lab (error notice / failure card), put focus back.
  const buttonRef = useRef<HTMLButtonElement>(null)
  const wasLaunching = useRef(false)
  useEffect(() => {
    if (wasLaunching.current && !launching && !blocked && document.activeElement === document.body) {
      buttonRef.current?.focus()
    }
    wasLaunching.current = launching
  }, [launching, blocked])

  const launchButton = (
    <Button
      ref={buttonRef}
      onClick={() => onLaunch(iface)}
      loading={launching}
      disabled={blocked}
      className="group/launch w-full"
      aria-describedby={blockedReason ? `blocked-${template.id}` : undefined}
    >
      <RocketIcon />
      Launch
      <ArrowRightIcon className="-ml-0.5 transition-transform duration-150 ease-out group-hover/launch:translate-x-0.5" />
    </Button>
  )

  return (
    <Card variant="interactive" className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-10 place-items-center rounded-lg border bg-primary-soft text-primary-ink transition-[background-color,color] duration-200 ease-out group-hover/card:group-hover/card:bg-primary group-hover/card:text-primary-foreground">
            <LabIcon id={template.id} className="size-[1.125rem]" />
          </span>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {active && (
              <Badge variant="default" mono>
                <StatusDot tone="primary" pulse />
                Active
              </Badge>
            )}
            {template.interfaces.map((i) => (
              <InterfaceBadge key={i} interface={i} />
            ))}
          </div>
        </div>
        <h3 className="mt-3 text-base leading-snug font-bold tracking-tight">{template.name}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{template.description}</p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <ul id={toolsId} className="flex flex-wrap gap-1.5" aria-label="Installed tools">
          {tools.map((tool) => (
            <li key={tool}>
              <Badge variant="outline" className="h-auto bg-popover py-0.5 font-mono text-[0.6875rem] font-normal whitespace-normal text-foreground/85">
                {tool}
              </Badge>
            </li>
          ))}
          {extra > 0 && (
            <li>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-controls={toolsId}
                className="h-full rounded-sm px-1.5 py-0.5 font-mono text-[0.6875rem] text-primary-ink outline-none transition-colors duration-150 hover:bg-primary-soft focus-visible:ring-[3px] focus-visible:ring-ring/35"
              >
                {expanded ? "Show less" : `+${extra} more`}
              </button>
            </li>
          )}
        </ul>

        <dl className="mt-auto grid grid-cols-[minmax(0,1.45fr)_minmax(0,0.9fr)_minmax(0,1fr)] gap-3 border-t border-dashed pt-4">
          <Stat icon={CpuIcon} label="Resources" value={formatResources(template)} />
          <Stat icon={ClockIcon} label="Time" value={`${template.durationMinutes} min`} />
          <Stat
            icon={WalletIcon}
            label="Approx."
            value={`≈ ${formatUsd(template.approxCostUsd)}`}
            title="Approximate cloud cost for a full lab"
          />
        </dl>
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-3">
        {multi && (
          <InterfacePicker
            labId={template.id}
            options={template.interfaces}
            value={iface}
            onChange={setIface}
            disabled={blocked}
          />
        )}
        {blockedReason ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {/* Disabled buttons don't get pointer/focus events, so the wrapper carries the tooltip. */}
              <span tabIndex={0} className="block w-full rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35">
                {launchButton}
                <span id={`blocked-${template.id}`} className="sr-only">
                  {blockedReason}
                </span>
              </span>
            </TooltipTrigger>
            <TooltipContent>{blockedReason}</TooltipContent>
          </Tooltip>
        ) : (
          launchButton
        )}
      </CardFooter>
    </Card>
  )
}

const CHOICE_KEY = "teal.interface."

function readChoice(template: Template): TemplateInterface {
  try {
    const saved = window.localStorage.getItem(CHOICE_KEY + template.id)
    const match = template.interfaces.find((i) => i === saved)
    if (match) return match
  } catch {
    // storage blocked: fall through to the default
  }
  return template.interfaces[0]
}

/** Selected interface for a lab; defaults to the first, remembers the last pick in localStorage. */
function useInterfaceChoice(template: Template) {
  const [choice, setChoice] = useState<TemplateInterface>(() => readChoice(template))
  // Catalog may change under us; never keep a value the lab doesn't offer.
  const value = template.interfaces.includes(choice) ? choice : template.interfaces[0]
  const set = (next: TemplateInterface) => {
    setChoice(next)
    try {
      window.localStorage.setItem(CHOICE_KEY + template.id, next)
    } catch {
      // ignore: the choice just won't be remembered
    }
  }
  return [value, set] as const
}

const INTERFACE_ICONS: Record<TemplateInterface, typeof CpuIcon> = {
  terminal: SquareTerminalIcon,
  vscode: CodeXmlIcon,
  jupyter: NotebookIcon,
}

/** Segmented radio group; arrow keys move + select, Tab enters/leaves the group. */
function InterfacePicker({
  labId,
  options,
  value,
  onChange,
  disabled,
}: {
  labId: string
  options: TemplateInterface[]
  value: TemplateInterface
  onChange: (next: TemplateInterface) => void
  disabled: boolean
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const labelId = `iface-label-${labId}`

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = options[(options.indexOf(value) + step + options.length) % options.length]
    onChange(next)
    refs.current[next]?.focus()
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="mono-label text-muted-foreground">
        Open with
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-disabled={disabled || undefined}
        onKeyDown={onKeyDown}
        className={cn(
          "grid gap-1 rounded-md border bg-muted p-1",
          disabled && "opacity-60"
        )}
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((opt) => {
          const selected = opt === value
          const Icon = INTERFACE_ICONS[opt]
          return (
            <button
              key={opt}
              ref={(el) => {
                refs.current[opt] = el
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(opt)}
              className={cn(
                "relative inline-flex h-8 items-center justify-center gap-1.5 rounded-sm px-2 text-xs font-semibold outline-none transition-colors duration-150",
                "focus-visible:ring-[3px] focus-visible:ring-ring/35 disabled:cursor-not-allowed",
                selected ? "text-primary-ink" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {selected && (
                <motion.span
                  layoutId={`iface-pill-${labId}`}
                  transition={{ type: "spring", stiffness: 500, damping: 36 }}
                  className="absolute inset-0 rounded-sm border border-primary/25 bg-card shadow-xs"
                />
              )}
              <Icon className="relative size-3.5 shrink-0" aria-hidden />
              <span className="relative truncate">{interfaceLabel(opt)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  title,
}: {
  icon: typeof CpuIcon
  label: string
  value: string
  title?: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1" title={title}>
      <dt className="mono-label flex items-center gap-1 text-muted-foreground">
        <Icon className="size-3 shrink-0" aria-hidden />
        {label}
      </dt>
      <dd className="truncate font-mono text-xs font-medium text-foreground">{value}</dd>
    </div>
  )
}

export function CatalogSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading labs">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-4 rounded-lg border bg-card p-5 shadow-xs">
          <div className="flex items-start justify-between">
            <Skeleton className="size-10 rounded-lg" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-10" />
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-dashed pt-4">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  )
}
