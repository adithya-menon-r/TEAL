import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Text input with a smooth border/ring transition on focus and a red ring +
 * one-shot shake when `aria-invalid` flips on.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-md border border-input bg-popover px-3 py-1 text-base shadow-xs",
        "transition-[border-color,box-shadow,background-color] duration-150 ease-out outline-none",
        "placeholder:text-muted-foreground/80",
        "hover:border-border-strong",
        "focus-visible:border-ring focus-visible:bg-white focus-visible:ring-[3px] focus-visible:ring-ring/20",
        "aria-invalid:animate-shake aria-invalid:border-danger aria-invalid:ring-[3px] aria-invalid:ring-danger/15",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
