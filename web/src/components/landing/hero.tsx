import { motion } from "motion/react"

import { AuthCtas } from "@/components/landing/site-nav"
import { TerminalDemo } from "@/components/landing/terminal-demo"
import { fadeSlideUp, stagger, transitions } from "@/lib/motion"

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Faint grid, faded at the edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-16 h-[680px] bg-grid mask-radial-fade opacity-80"
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-10 pb-20 sm:px-6 sm:pt-16 lg:grid-cols-[1fr_1.1fr] lg:gap-12 lg:pt-20 lg:pb-28">
        <motion.div variants={stagger(0.07)} initial="hidden" animate="visible" className="min-w-0">
          <motion.p variants={fadeSlideUp} className="mono-label text-accent-ink">
            TEAL — Temporary Environments for Academic Labs
          </motion.p>

          <motion.h1
            variants={fadeSlideUp}
            className="mt-3 text-[2.5rem] leading-[1.05] font-extrabold tracking-[-0.03em] text-balance sm:text-[3.5rem] lg:text-[2.75rem] xl:text-[3.25rem]"
          >
            Your course lab, ready in seconds.{" "}
            <span className="block text-primary-ink">Nothing to install.</span>
          </motion.h1>

          <motion.p
            variants={fadeSlideUp}
            className="mt-5 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg"
          >
            Browser-based labs for Amrita students. Log in with your Amrita student email address,
            pick your course, and start coding. Every lab cleans itself up after an
            hour.
          </motion.p>

          <motion.div variants={fadeSlideUp} className="mt-8 flex flex-wrap items-center gap-3">
            <AuthCtas size="lg" secondary="none" />
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
