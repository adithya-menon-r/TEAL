import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2Icon } from "lucide-react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Buttons carry their own micro-interactions: 150 ms ease-out colour/shadow
 * transitions, a tiny press-down (scale) on :active, and a teal focus ring.
 * `loading` swaps in a spinner, keeps the width stable and disables the button.
 */
const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent",
    "text-sm font-semibold whitespace-nowrap select-none outline-none",
    "transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out",
    "active:not-disabled:scale-[0.98]",
    "focus-visible:ring-[3px] focus-visible:ring-ring/35 focus-visible:border-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary-hover hover:shadow-md hover:shadow-primary/20",
        accent:
          "bg-accent text-accent-foreground shadow-sm hover:bg-[color-mix(in_oklab,var(--accent),var(--foreground)_8%)]",
        outline:
          "border-border-strong bg-card text-foreground shadow-xs hover:border-foreground/30 hover:bg-popover aria-expanded:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklab,var(--secondary),var(--foreground)_6%)]",
        ghost:
          "text-foreground hover:bg-foreground/[0.06] aria-expanded:bg-foreground/[0.06]",
        destructive:
          "bg-danger text-danger-foreground shadow-sm hover:bg-[color-mix(in_oklab,var(--danger),black_12%)] focus-visible:border-danger focus-visible:ring-danger/30",
        "destructive-outline":
          "border-danger/35 bg-card text-danger hover:border-danger/60 hover:bg-danger-soft focus-visible:border-danger focus-visible:ring-danger/25",
        link: "h-auto! px-0! text-primary-ink underline-offset-4 decoration-primary-ink/40 hover:underline active:scale-100",
      },
      size: {
        default: "h-9 px-4",
        xs: "h-7 gap-1 rounded-sm px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 text-[0.8125rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 px-5 text-[0.9375rem]",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Shows a spinner and disables the button. Ignored with `asChild`. */
    loading?: boolean
  }

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  if (asChild) {
    return (
      <Slot.Root
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </Slot.Root>
    )
  }

  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading ? (
        <>
          <span className="invisible inline-flex items-center gap-2">{children}</span>
          <span className="absolute inset-0 inline-flex items-center justify-center">
            <Loader2Icon className="animate-spin" aria-hidden />
            <span className="sr-only">Loading</span>
          </span>
        </>
      ) : (
        children
      )}
    </button>
  )
}

export { Button, buttonVariants }
export type { ButtonProps }
