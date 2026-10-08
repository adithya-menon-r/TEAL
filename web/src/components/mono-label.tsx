import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

/** Small uppercase monospace label: eyebrows, metadata keys, section tags. */
export function MonoLabel({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn("mono-label text-muted-foreground", className)} {...props} />
}

/** Key/value pair in the "LABEL  value" metadata style. */
export function Meta({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <MonoLabel>{label}</MonoLabel>
      <span className="text-sm font-medium text-foreground">{children}</span>
    </div>
  )
}

/** Keyboard hint, e.g. <Kbd>Enter</Kbd>. */
export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-b-2 border-border-strong bg-card px-1.5 font-mono text-[0.6875rem] font-medium text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
