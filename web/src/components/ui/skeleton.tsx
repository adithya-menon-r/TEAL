import { cn } from "@/lib/utils"

/** Loading placeholder with a soft left-to-right shimmer. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        "animate-shimmer rounded-md bg-muted",
        "bg-[linear-gradient(90deg,transparent_0%,color-mix(in_oklab,var(--card)_70%,transparent)_50%,transparent_100%)] bg-size-[200%_100%] bg-no-repeat",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
