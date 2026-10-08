import { cn } from "@/lib/utils"

/**
 * The TEAL mark: a teal tile holding a hexagonal container (an environment)
 * with a clay core. Static, geometric, legible down to 16px.
 *
 * logo-options (swap the <path>/<circle> children below to try another):
 *  A  T + dot:
 *     <path d="M8 10.5h16M16 10.5V24" stroke-width="4" stroke-linecap="round" class="stroke-background"/>
 *     <circle cx="24" cy="23" r="3" class="fill-accent"/>
 *  C  Timer ring:
 *     <path d="M16 7.5a8.5 8.5 0 1 0 8.5 8.5" stroke-width="3.2" stroke-linecap="round" class="stroke-background"/>
 *     <circle cx="23.2" cy="8.8" r="3" class="fill-accent"/>
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={cn("block size-7 shrink-0", className)}>
      <rect width="32" height="32" rx="7" className="fill-primary" />
      <path
        d="M16 6.5l8.5 4.9v9.7L16 26l-8.5-4.9v-9.7z"
        className="stroke-background"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16.2" r="3.2" className="fill-accent" />
    </svg>
  )
}

type WordmarkProps = {
  className?: string
  /** Show "Temporary Environments for Academic Labs" next to the name (hidden < sm). */
  tagline?: boolean
  size?: "sm" | "md" | "lg"
}

/** TEAL wordmark. Wrap in a Link for navigation; */
export function Wordmark({ className, tagline = false, size = "md" }: WordmarkProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-2.5", className)}
      aria-label="TEAL"
    >
      <LogoMark
        className={cn(size === "sm" && "size-6", size === "md" && "size-7", size === "lg" && "size-9")}
      />
      <span
        className={cn(
          "font-heading translate-y-px leading-none font-extrabold tracking-[0.14em] text-foreground",
          size === "sm" && "text-sm",
          size === "md" && "text-base",
          size === "lg" && "text-xl"
        )}
        aria-hidden
      >
        TEAL
      </span>
      {tagline && (
        <span
          aria-hidden
          className="hidden border-l pl-2.5 mono-label text-muted-foreground sm:inline"
        >
          Academic Labs
        </span>
      )}
    </span>
  )
}
