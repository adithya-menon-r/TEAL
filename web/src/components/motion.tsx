import type { ReactNode } from "react"
import { motion, type HTMLMotionProps } from "motion/react"

import { fadeSlideUp, stagger, transitions } from "@/lib/motion"

/** Page / section entrance: fade + 8px slide up on mount. */
export function FadeIn({
  children,
  delay = 0,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number; children?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transitions.slow, delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/** Scroll reveal: animates once when ~20% of the element is in view. */
export function Reveal({
  children,
  delay = 0,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number; children?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ ...transitions.slow, duration: 0.4, delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/** Container that reveals its <StaggerItem> children one after another. */
export function Stagger({
  children,
  step = 0.07,
  inView = true,
  ...props
}: HTMLMotionProps<"div"> & { step?: number; inView?: boolean; children?: ReactNode }) {
  return (
    <motion.div
      variants={stagger(step)}
      initial="hidden"
      {...(inView
        ? { whileInView: "visible", viewport: { once: true, amount: 0.15 } }
        : { animate: "visible" })}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, ...props }: HTMLMotionProps<"div"> & { children?: ReactNode }) {
  return (
    <motion.div variants={fadeSlideUp} {...props}>
      {children}
    </motion.div>
  )
}
