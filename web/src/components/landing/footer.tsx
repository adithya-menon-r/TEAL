import { Link } from "react-router-dom"

import { GoogleCloudLogo } from "@/components/brand/google-cloud-logo"
import { Wordmark } from "@/components/brand/wordmark"
import { AuthCtas } from "@/components/landing/site-nav"
import { Reveal } from "@/components/motion"
import { MonoLabel } from "@/components/mono-label"

/** Closing call-to-action band. */
export function CtaBand() {
  return (
    <section className="border-t">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <Reveal className="relative overflow-hidden rounded-2xl border bg-card px-6 py-12 text-center shadow-sm sm:px-12 sm:py-14">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-dots mask-radial-fade opacity-70" />
          <div className="relative flex flex-col items-center">
            <MonoLabel className="text-accent-ink">Ready when you are</MonoLabel>
            <h2 className="mt-3 max-w-xl text-[1.75rem] leading-tight font-bold tracking-tight text-balance sm:text-4xl">
              Open a terminal for your next lab in under a minute.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              All you need is a browser and your Amrita student email.
            </p>
            <AuthCtas size="lg" secondary="none" className="mt-7 flex-wrap justify-center" />
          </div>
        </Reveal>
      </div>
    </section>
  )
}

const FOOTER_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#labs", label: "Labs" },
  { href: "#faq", label: "FAQ" },
]

export function SiteFooter() {
  return (
    <footer className="border-t bg-card/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-sm flex-col gap-3">
          <Wordmark />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Temporary Environments for Academic Labs. Ready-to-use course labs in the browser for
            Amrita students.
          </p>
          <span className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <GoogleCloudLogo className="size-4" />
            Built on Google Cloud Platform
          </span>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
          <MonoLabel className="col-span-2 mb-1">Explore</MonoLabel>
          {FOOTER_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </a>
          ))}
          <Link to="/login" className="text-muted-foreground transition-colors hover:text-foreground">
            Log in
          </Link>
          <Link to="/signup" className="text-muted-foreground transition-colors hover:text-foreground">
            Sign up
          </Link>
        </nav>
      </div>
      <div className="border-t">
        <div className="mx-auto w-full max-w-6xl px-4 py-3 text-center text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} TEAL
        </div>
      </div>
    </footer>
  )
}
