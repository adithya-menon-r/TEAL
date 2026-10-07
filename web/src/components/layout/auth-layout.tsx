import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { Wordmark } from "@/components/brand/wordmark"
import { FadeIn } from "@/components/motion"
import { MonoLabel } from "@/components/mono-label"

type AuthLayoutProps = {
  eyebrow?: string
  title: string
  description?: ReactNode
  children: ReactNode
  /** Under the card, e.g. "New here? Create an account". */
  footer?: ReactNode
  /** Optional element above the title (icon, illustration). */
  media?: ReactNode
}

/** Centered card on a faint grid, with the wordmark linking home. */
export function AuthLayout({ eyebrow, title, description, children, footer, media }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-grid mask-radial-fade opacity-70"
      />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link
          to="/"
          className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
        >
          <Wordmark />
        </Link>
        <Link
          to="/"
          className="text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          About TEAL
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0">
        <FadeIn className="w-full max-w-[400px]">
          <div className="rounded-lg border bg-card p-6 shadow-md sm:p-8">
            {media && <div className="mb-5">{media}</div>}
            {eyebrow && <MonoLabel className="text-accent-ink">{eyebrow}</MonoLabel>}
            <h1 className="mt-1.5 text-[1.375rem] leading-tight font-bold tracking-tight text-balance">
              {title}
            </h1>
            {description && (
              <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</div>
            )}
            <div className="mt-6">{children}</div>
          </div>
          {footer && <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>}
        </FadeIn>
      </main>
    </div>
  )
}

/** Inline text link styled for auth footers. */
export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-sm font-semibold text-primary-ink underline-offset-4 decoration-primary-ink/40 transition-colors duration-150 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/35"
    >
      {children}
    </Link>
  )
}
