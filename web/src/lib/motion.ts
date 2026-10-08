import type { Transition, Variants } from "motion/react"

/**
 * Shared motion presets. Keep everything short (150–300 ms) and ease-out.
 * `<MotionConfig reducedMotion="user">` in main.tsx turns transform/layout
 * animations off for people who prefer reduced motion.
 */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

export const transitions = {
  fast: { duration: 0.15, ease: EASE_OUT },
  base: { duration: 0.22, ease: EASE_OUT },
  slow: { duration: 0.3, ease: EASE_OUT },
} satisfies Record<string, Transition>

/** Fade + small upward slide, used for page and section entrances. */
export const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: transitions.slow },
}

/** Parent variant that staggers its children's `fadeSlideUp`. */
export const stagger = (step = 0.06, delay = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: step, delayChildren: delay } },
})

/** Height + opacity collapse for inline messages (errors, hints). */
export const collapse: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: "auto", transition: transitions.base },
  exit: { opacity: 0, height: 0, transition: transitions.fast },
}
