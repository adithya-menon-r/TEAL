import type { ReactNode } from "react"

import { Reveal } from "@/components/motion"
import { MonoLabel } from "@/components/mono-label"
import { cn } from "@/lib/utils"

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  align?: "left" | "center"
  className?: string
}) {
  return (
    <Reveal
      className={cn(
        "flex max-w-2xl flex-col gap-3",
        align === "center" && "mx-auto items-center text-center",
        className
      )}
    >
      <MonoLabel className="inline-flex items-center gap-2 text-accent-ink">
        <span className="h-px w-5 bg-accent" aria-hidden />
        {eyebrow}
      </MonoLabel>
      <h2 className="text-[1.75rem] leading-[1.15] font-bold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="text-[0.9375rem] leading-relaxed text-pretty text-muted-foreground sm:text-base">
          {description}
        </p>
      )}
    </Reveal>
  )
}
