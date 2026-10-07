import { motion } from "motion/react"
import { MonitorIcon } from "lucide-react"

import { AuthCtas } from "@/components/landing/site-nav"
import { TerminalDemo } from "@/components/landing/terminal-demo"
import { StatusDot } from "@/components/status-dot"
import { fadeSlideUp, stagger, transitions } from "@/lib/motion"

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Faint grid, faded at the edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-16 h-[680px] bg-grid mask-radial-fade opacity-80"
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-10 pb-20 sm:px-6 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:pt-20 lg:pb-28">
        <motion.div variants={stagger(0.07)} initial="hidden" animate="visible" className="min-w-0">
          <motion.div variants={fadeSlideUp}>
            <span className="inline-flex max-w-full items-center gap-2 rounded-full border bg-card/80 py-1 pr-3 pl-2 font-mono text-[0.6875rem] tracking-[0.04em] text-muted-foreground shadow-xs">
              <StatusDot tone="primary" pulse />
              <span className="truncate">Linux · Haskell · TensorFlow labs</span>
            </span>
          </motion.div>

          <motion.p variants={fadeSlideUp} className="mt-6 mono-label text-accent-ink">
            TEAL — Temporary Environments for Academic Labs
          </motion.p>

          <motion.h1
            variants={fadeSlideUp}
            className="mt-3 text-[2.5rem] leading-[1.05] font-extrabold tracking-[-0.03em] text-balance sm:text-[3.5rem] lg:text-[3.6rem] xl:text-[3.9rem]"
          >
            Your course lab, ready in seconds.{" "}
            <span className="text-primary-ink">Nothing to install.</span>
          </motion.h1>

          <motion.p
            variants={fadeSlideUp}
            className="mt-5 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg"
          >
            Browser-based Linux, Haskell and Jupyter labs for Amrita students. Log in with your
            student email, pick your course, and start coding. Every lab cleans itself up after an
            hour.
          </motion.p>

          <motion.div variants={fadeSlideUp} className="mt-8 flex flex-wrap items-center gap-3">
            <AuthCtas size="lg" secondary="labs" />
          </motion.div>

          <motion.div
            variants={fadeSlideUp}
            className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.8125rem] text-muted-foreground"
          >
            <span className="inline-flex items-center gap-1.5">
              <MonitorIcon className="size-3.5" aria-hidden />
              Windows, macOS, Linux
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs">
              <span className="text-accent-ink">@</span>xx.students.amrita.edu
            </span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...transitions.slow, duration: 0.5, delay: 0.15 }}
          className="relative min-w-0"
        >
          {/* Offset frame behind the window */}
          <div
            aria-hidden
            className="absolute -inset-3 -z-0 hidden rounded-2xl border border-dashed border-border-strong/70 sm:block"
          />
          <TerminalDemo className="relative" />
        </motion.div>
      </div>
    </section>
  )
}
