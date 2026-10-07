import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { CheckIcon, CopyIcon } from "lucide-react"

import { Button, type ButtonProps } from "@/components/ui/button"
import { transitions } from "@/lib/motion"
import { cn } from "@/lib/utils"

type CopyButtonProps = Omit<ButtonProps, "onClick" | "children"> & {
  value: string
  /** Visible text; omit for an icon-only button. */
  label?: string
}

/** Copies `value` and swaps the icon for a check for 1.5 s. */
export function CopyButton({
  value,
  label,
  variant = "ghost",
  size,
  className,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can be blocked (permissions / insecure context); fail quietly.
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size ?? (label ? "sm" : "icon-sm")}
      onClick={copy}
      aria-label={label ? undefined : copied ? "Copied" : "Copy to clipboard"}
      className={cn("overflow-hidden", className)}
      {...props}
    >
      <span className="relative inline-grid size-4 place-items-center">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={copied ? "check" : "copy"}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={transitions.fast}
            className={cn("inline-grid place-items-center", copied && "text-primary")}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </motion.span>
        </AnimatePresence>
      </span>
      {label && <span>{copied ? "Copied" : label}</span>}
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </Button>
  )
}
