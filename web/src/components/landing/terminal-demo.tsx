import { useEffect, useRef, useState } from "react"
import { motion, useInView, useReducedMotion } from "motion/react"
import {
  CheckIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileArchiveIcon,
  FileCodeIcon,
  FileTextIcon,
  FolderIcon,
  HomeIcon,
  LockIcon,
  MaximizeIcon,
  MinusIcon,
  PowerIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"

import { LogoMark } from "@/components/brand/wordmark"
import { Countdown } from "@/components/countdown"
import { transitions } from "@/lib/motion"
import { cn } from "@/lib/utils"

type Step =
  | { kind: "status"; text: string; wait: number }
  | { kind: "ready"; text: string; wait: number }
  | { kind: "cmd"; prompt: string; text: string; wait: number }
  | { kind: "out"; text: string; wait: number }

const SCRIPT: Step[] = [
  { kind: "status", text: "Creating your lab", wait: 650 },
  { kind: "status", text: "Starting container", wait: 900 },
  { kind: "ready", text: "Ready in 18s · 1 vCPU · 2 GiB", wait: 700 },
  { kind: "cmd", prompt: "student@teal:~$", text: "ghci", wait: 450 },
  { kind: "out", text: "GHCi, version 9.6.6  :? for help", wait: 500 },
  { kind: "cmd", prompt: "ghci>", text: "map (*2) [1..5]", wait: 350 },
  { kind: "out", text: "[2,4,6,8,10]", wait: 650 },
  { kind: "cmd", prompt: "ghci>", text: "sum [x*x | x <- [1..10], odd x]", wait: 350 },
  { kind: "out", text: "165", wait: 500 },
]

const DEMO_FILES = [
  { name: "src", isDir: true, size: null },
  { name: "Lab1.hs", isDir: false, size: "1.4 KB", type: "code" },
  { name: "assignment.txt", isDir: false, size: "2.4 KB", type: "doc" },
  { name: "notes.txt", isDir: false, size: "840 B", type: "doc" },
  { name: "output.log", isDir: false, size: "3.2 KB", type: "doc" },
]

const TYPE_MS = 55

// Terminal brand accents on pitch black (#000000)
const PROMPT_TEAL = "text-[#2dd4bf]"
const PROMPT_CLAY = "text-[#e3b096]"

/**
 * Faux browser window matching the redesigned TEAL Lab Environment.
 * Features:
 *  - Real TopBar with centered live countdown & End Lab button
 *  - Pure black terminal with brand teal cursor (#2dd4bf)
 *  - Real RightPanel File Explorer with breadcrumbs, file icons, and download actions
 */
export function TerminalDemo({ className }: { className?: string }) {
  const reduce = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const inView = useInView(rootRef, { amount: 0.3 })
  const [step, setStep] = useState(0)
  const [chars, setChars] = useState(0)
  const [expiresAt] = useState(() => Date.now() + (59 * 60 + 12) * 1000)

  const done = reduce ? SCRIPT.length : step
  const current = SCRIPT[done]

  useEffect(() => {
    if (reduce || !inView) return
    let timer: number
    if (!current) {
      // Script finished: pause on the last frame, then restart.
      timer = window.setTimeout(() => {
        setStep(0)
        setChars(0)
      }, 3800)
    } else if (current.kind === "cmd" && chars < current.text.length) {
      timer = window.setTimeout(() => setChars((c) => c + 1), TYPE_MS + Math.random() * 45)
    } else {
      timer = window.setTimeout(() => {
        setStep((s) => s + 1)
        setChars(0)
      }, current.wait)
    }
    return () => window.clearTimeout(timer)
  }, [reduce, inView, current, chars])

  // Lines to render: completed steps + the one in progress.
  const visible = SCRIPT.slice(0, Math.min(done + 1, SCRIPT.length))

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-border-strong/70 bg-card shadow-lg",
        className
      )}
      aria-label="Preview of the TEAL lab environment running in the browser"
      role="img"
    >
      {/* 1. Browser Window Chrome */}
      <div className="flex items-center gap-3 border-b bg-muted/60 px-3 py-2">
        <div className="flex min-w-0 max-w-[75%] items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 font-mono text-[0.6875rem] text-muted-foreground">
          <LockIcon className="size-3 shrink-0 text-primary-ink" aria-hidden />
          <span className="truncate">lab-pfl-k3x9p2.asia-south1.run.app</span>
        </div>
        <div className="-my-2 -mr-3 ml-auto flex self-stretch text-muted-foreground" aria-hidden>
          <span className="grid w-8 place-items-center transition-colors hover:bg-foreground/[0.07]">
            <MinusIcon className="size-3" />
          </span>
          <span className="grid w-8 place-items-center transition-colors hover:bg-foreground/[0.07]">
            <MaximizeIcon className="size-2.5" />
          </span>
          <span className="grid w-8 place-items-center transition-colors hover:bg-danger hover:text-white">
            <XIcon className="size-3" />
          </span>
        </div>
      </div>

      {/* 2. Redesigned Lab TopBar: Brand Logo | Centered Countdown | End Lab */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-card px-3.5 py-2">
        {/* Left: Brand Logo & Wordmark */}
        <div className="flex items-center gap-2">
          <LogoMark className="size-5" />
          <span className="font-heading text-xs font-extrabold tracking-[0.14em] text-foreground">
            TEAL
          </span>
        </div>

        {/* Center: Live Prominent Countdown */}
        <div className="flex justify-center">
          <Countdown expiresAt={expiresAt} className="h-6 px-2.5 text-[0.6875rem]" />
        </div>

        {/* Right: End Lab Button */}
        <div className="flex justify-end">
          <span className="inline-flex h-6 items-center gap-1.5 rounded-md border border-danger/35 bg-danger-soft/60 px-2 text-[0.6875rem] font-semibold text-danger">
            <PowerIcon className="size-3" />
            <span>End Lab</span>
          </span>
        </div>
      </div>

      {/* 3. Main Workspace: Pure Black Terminal + Persistent Right File Explorer */}
      <div className="flex">
        {/* Terminal Canvas (Matching pure black ttyd with teal cursor) */}
        <div className="h-[280px] min-w-0 flex-1 overflow-hidden bg-[#000000] px-4 py-3 font-mono text-[0.75rem] leading-[1.7] text-white/90 sm:h-[310px] sm:text-[0.8125rem]">
          {visible.map((line, i) => {
            const isCurrent = i === done
            const isDone = i < done
            return (
              <motion.div
                key={`${i}-${line.text}`}
                initial={reduce ? false : { opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={transitions.fast}
                className="break-words whitespace-pre-wrap"
              >
                {line.kind === "status" && (
                  <span className="text-white/45">
                    {isDone ? (
                      <CheckIcon className={cn("mr-2 inline size-3.5 align-[-2px]", PROMPT_TEAL)} aria-hidden />
                    ) : (
                      <span className={cn("mr-2 inline-block w-3.5 text-center animate-pulse", PROMPT_CLAY)}>●</span>
                    )}
                    {line.text}
                    {!isDone && <span className="animate-pulse">…</span>}
                  </span>
                )}
                {line.kind === "ready" && (
                  <span className={PROMPT_TEAL}>
                    <span className="mr-2 inline-block w-3.5 text-center">✓</span>
                    {line.text}
                  </span>
                )}
                {line.kind === "cmd" && (
                  <>
                    <span className={line.prompt.startsWith("ghci") ? PROMPT_CLAY : PROMPT_TEAL}>{line.prompt}</span>{" "}
                    <span>{isCurrent ? line.text.slice(0, chars) : line.text}</span>
                    {isCurrent && <Caret />}
                  </>
                )}
                {line.kind === "out" && <span className="text-white/80">{line.text}</span>}
              </motion.div>
            )
          })}
          {done >= SCRIPT.length && (
            <div>
              <span className={PROMPT_CLAY}>ghci&gt;</span> <Caret />
            </div>
          )}
        </div>

        {/* RightPanel: Live File Explorer (Compact sidebar) */}
        <aside className="hidden w-[155px] shrink-0 flex-col border-l border-border bg-card select-none sm:flex sm:w-[165px]">
          {/* Lab Title Header */}
          <div className="border-b border-border bg-card px-2.5 py-2">
            <h3 className="font-heading text-[0.6875rem] font-bold text-foreground truncate" title="PFL: Principles of Functional Languages">
              PFL: Principles of Functional Language
            </h3>
          </div>

          {/* Breadcrumbs & Toolbar */}
          <div className="flex items-center justify-between border-b border-border bg-popover/80 px-2 py-1 font-mono text-[0.625rem] text-muted-foreground">
            <div className="flex items-center gap-1 min-w-0">
              <HomeIcon className="size-2.5 text-primary-ink shrink-0" />
              <ChevronRightIcon className="size-2 opacity-50 shrink-0" />
              <span className="font-semibold text-foreground truncate">work</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="p-0.5 text-muted-foreground" title="Refresh files">
                <RefreshCwIcon className="size-2.5" />
              </span>
              <span
                className="inline-flex items-center gap-0.5 rounded border border-border bg-card px-1 py-0.5 text-[0.5625rem] text-primary-ink font-medium"
                title="Download all as archive"
              >
                <FileArchiveIcon className="size-2.5" />
                <DownloadIcon className="size-2" />
              </span>
            </div>
          </div>

          {/* File Explorer List */}
          <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
            {DEMO_FILES.map((file) => (
              <div
                key={file.name}
                className="group flex items-center justify-between rounded px-1.5 py-1 text-[0.6875rem] transition-colors hover:bg-primary/[0.08]"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {file.isDir ? (
                    <FolderIcon className="size-3 text-primary shrink-0 fill-primary/20" />
                  ) : file.type === "code" ? (
                    <FileCodeIcon className="size-3 text-primary-ink shrink-0" />
                  ) : (
                    <FileTextIcon className="size-3 text-muted-foreground shrink-0" />
                  )}
                  <span
                    className={cn(
                      "truncate",
                      file.isDir ? "font-semibold text-primary-ink" : "text-foreground"
                    )}
                  >
                    {file.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0 pl-1">
                  {file.size && (
                    <span className="font-mono text-[0.5625rem] text-muted-foreground">
                      {file.size}
                    </span>
                  )}
                  {!file.isDir && (
                    <DownloadIcon className="size-2.5 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100 group-hover:text-primary-ink" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Persistent Warning Notice */}
          <div className="mt-auto border-t border-border bg-popover/80 px-2 py-1 text-[0.5625rem] text-muted-foreground flex items-center justify-center gap-1">
            <TriangleAlertIcon className="size-2.5 shrink-0 text-warning" />
            <span className="truncate">Files deleted when lab ends</span>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Caret() {
  return (
    <span
      aria-hidden
      className="ml-px inline-block h-[1.1em] w-[0.55em] translate-y-[0.18em] bg-[#2dd4bf] animate-caret"
    />
  )
}
