import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Soft-filled badges. Every variant pairs a tinted fill with an AA-contrast
 * text colour. Add `mono` for the uppercase monospace metadata style.
 */
const badgeVariants = cva(
  [
    "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-sm border px-2",
    "text-xs font-semibold whitespace-nowrap transition-colors duration-150",
    "focus-visible:ring-[3px] focus-visible:ring-ring/35",
    "[&>svg]:pointer-events-none [&>svg]:size-3!",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "border-primary/20 bg-primary-soft text-primary-ink",
        accent: "border-accent/30 bg-accent-soft text-accent-ink",
        info: "border-info/25 bg-info-soft text-info",
        solid: "border-transparent bg-primary text-primary-foreground",
        outline: "border-border-strong bg-card text-foreground",
        muted: "border-transparent bg-muted text-muted-foreground",
        warning: "border-warning/25 bg-warning-soft text-warning",
        danger: "border-danger/25 bg-danger-soft text-danger",
        destructive: "border-danger/25 bg-danger-soft text-danger",
      },
      mono: {
        true: "font-mono text-[0.6875rem] font-medium tracking-[0.06em] uppercase",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      mono: false,
    },
  }
)

function Badge({
  className,
  variant = "default",
  mono = false,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, mono }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
