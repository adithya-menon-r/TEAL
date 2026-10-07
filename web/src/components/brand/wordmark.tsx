import { cn } from "@/lib/utils"

/** The TEAL mark: a teal tile with a prompt chevron and a clay cursor. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn("size-7 shrink-0", className)}
    >
      <rect width="32" height="32" rx="7" className="fill-primary" />
      <path
        d="M9 11.5l5 4.5-5 4.5"
        className="stroke-background"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="16"
        y="19"
        width="7.5"
        height="2.6"
        rx="1.3"
        className="fill-accent origin-[19.75px_20.3px] transition-transform duration-300 ease-out group-hover/wordmark:scale-x-125"
      />
    </svg>
  )
}

type WordmarkProps = {
  className?: string
  /** Show "Temporary Environments for Academic Labs" next to the name (hidden < sm). */
  tagline?: boolean
  size?: "sm" | "md" | "lg"
}

/** TEAL wordmark. Wrap in a Link for navigation; hovering nudges the cursor. */
export function Wordmark({ className, tagline = false, size = "md" }: WordmarkProps) {
  return (
    <span
      className={cn("group/wordmark inline-flex items-center gap-2.5", className)}
      aria-label="TEAL"
    >
      <LogoMark
        className={cn(size === "sm" && "size-6", size === "md" && "size-7", size === "lg" && "size-9")}
      />
      <span
        className={cn(
          "font-heading leading-none font-extrabold tracking-[0.14em] text-foreground",
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
