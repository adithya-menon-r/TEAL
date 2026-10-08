import { useEffect, useRef, useState } from "react"
import { motion, useInView, useReducedMotion } from "motion/react"
import { CheckIcon, FolderDownIcon, LockIcon, MaximizeIcon, MinusIcon, XIcon } from "lucide-react"

import { LogoMark } from "@/components/brand/wordmark"
import { Countdown } from "@/components/countdown"
import { MonoLabel } from "@/components/mono-label"
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
  { kind: "ready", text: "Ready in 21s · 1 vCPU · 2 GiB", wait: 700 },
  { kind: "cmd", prompt: "student@teal:~$", text: "ghci", wait: 450 },
  { kind: "out", text: "GHCi, version 9.6.6  :? for help", wait: 500 },
  { kind: "cmd", prompt: "ghci>", text: "map (*2) [1..5]", wait: 350 },
  { kind: "out", text: "[2,4,6,8,10]", wait: 650 },
  { kind: "cmd", prompt: "ghci>", text: "sum [x*x | x <- [1..10], odd x]", wait: 350 },
  { kind: "out", text: "165", wait: 500 },
]

const TYPE_MS = 55

// Terminal-only accents tuned for the dark surface (AA on #11201f).
const PROMPT = "text-[#7fd1c9]"
const CLAY = "text-[#e3b096]"

/**
 * Faux browser window showing a TEAL lab page whose terminal "types" a short
 * short ghci session, then loops. Pure HTML/CSS + motion; no images. Paused while
 * off-screen; static (fully typed) for prefers-reduced-motion.
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
      aria-label="Preview of a TEAL lab running in the browser"
      role="img"
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-3 border-b bg-muted/60 px-3 py-2.5">
        <div className="flex min-w-0 max-w-[75%] items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 font-mono text-[0.6875rem] text-muted-foreground">
          <LockIcon className="size-3 shrink-0" aria-hidden />
          <span className="truncate">lab-k3x9p2q7ad-el.a.run.app</span>
        </div>
        <div className="-my-2.5 -mr-3 ml-auto flex self-stretch text-muted-foreground" aria-hidden>
          <span className="grid w-9 place-items-center transition-colors hover:bg-foreground/[0.07]">
            <MinusIcon className="size-3.5" />
          </span>
          <span className="grid w-9 place-items-center transition-colors hover:bg-foreground/[0.07]">
            <MaximizeIcon className="size-3" />
          </span>
          <span className="grid w-9 place-items-center transition-colors hover:bg-danger hover:text-white">
            <XIcon className="size-3.5" />
          </span>
        </div>
      </div>

      {/* Lab page top bar (PLAN.md §4.4) */}
      <div className="flex items-center gap-2 border-b px-3 py-2 sm:gap-3">
        <LogoMark className="size-5" />
        <span className="text-xs font-extrabold tracking-[0.14em]">TEAL</span>
        <Countdown expiresAt={expiresAt} className="ml-1 h-6 px-2 text-[0.6875rem]" />
        <span className="hidden h-6 items-center rounded-md border border-danger/30 bg-card px-2 text-[0.6875rem] font-semibold text-danger min-[400px]:inline-flex">
          End Lab
        </span>
        <span className="ml-auto inline-flex h-6 items-center gap-1 rounded-md border bg-card px-2 text-[0.6875rem] font-medium text-muted-foreground">
          <FolderDownIcon className="size-3" aria-hidden />
          Files
        </span>
      </div>

      <div className="flex">
        {/* Terminal */}
        <div className="h-[268px] min-w-0 flex-1 overflow-hidden bg-terminal px-3.5 py-3 font-mono text-[0.75rem] leading-[1.7] text-terminal-foreground sm:h-[300px] sm:text-[0.8125rem]">
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
                  <span className="text-terminal-muted">
                    {isDone ? (
                      <CheckIcon className={cn("mr-2 inline size-3.5 align-[-2px]", PROMPT)} aria-hidden />
                    ) : (
                      <span className={cn("mr-2 inline-block w-3.5 text-center animate-pulse", CLAY)}>●</span>
                    )}
                    {line.text}
                    {!isDone && <span className="animate-pulse">…</span>}
                  </span>
                )}
                {line.kind === "ready" && (
                  <span className={PROMPT}>
                    <span className="mr-2 inline-block w-3.5 text-center">✓</span>
                    {line.text}
                  </span>
                )}
                {line.kind === "cmd" && (
                  <>
                    <span className={line.prompt.startsWith("ghci") ? CLAY : PROMPT}>{line.prompt}</span>{" "}
                    <span>{isCurrent ? line.text.slice(0, chars) : line.text}</span>
                    {isCurrent && <Caret />}
                  </>
                )}
                {line.kind === "out" && <span className="text-terminal-foreground/85">{line.text}</span>}
              </motion.div>
            )
          })}
          {done >= SCRIPT.length && (
            <div>
              <span className={CLAY}>ghci&gt;</span> <Caret />
            </div>
          )}
        </div>

        {/* Details panel */}
        <aside className="hidden w-[34%] max-w-[210px] shrink-0 flex-col gap-4 border-l bg-card p-3.5 sm:flex">
          <div>
            <p className="text-[0.8125rem] leading-snug font-semibold">Your course lab</p>
            <p className="mt-1 text-[0.6875rem] leading-relaxed text-muted-foreground">
              Course tools, preinstalled.
            </p>
          </div>
          <div>
            <MonoLabel className="text-[0.625rem]">Installed</MonoLabel>
            <ul className="mt-1.5 space-y-1 text-[0.6875rem] text-foreground/85">
              {["GHC 9.x · GHCi", "cabal, stack", "vim, nano, git"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <span className="size-1 rounded-full bg-accent" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <MonoLabel className="text-[0.625rem]">Resources</MonoLabel>
            <p className="mt-1 font-mono text-[0.6875rem]">1 vCPU · 2 GiB</p>
          </div>
          <p className="mt-auto rounded-md border border-dashed bg-muted/50 p-2 text-[0.625rem] leading-snug text-muted-foreground">
            Files are deleted when the lab ends.
          </p>
        </aside>
      </div>
    </div>
  )
}

function Caret() {
  return (
    <span
      aria-hidden
      className="ml-px inline-block h-[1.05em] w-[0.55em] translate-y-[0.18em] bg-[#7fd1c9] animate-caret"
    />
  )
}
