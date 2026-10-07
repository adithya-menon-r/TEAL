import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ArrowRightIcon, MenuIcon, XIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { useAuth } from "@/auth/context"
import { Wordmark } from "@/components/brand/wordmark"
import { Button } from "@/components/ui/button"
import { transitions } from "@/lib/motion"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#labs", label: "Labs" },
  { href: "#faq", label: "FAQ" },
] as const

/** Auth-aware call-to-action buttons (shared by nav, hero and CTA band). */
export function AuthCtas({
  size = "default",
  className,
  secondary = "login",
  onNavigate,
}: {
  size?: "default" | "sm" | "lg"
  className?: string
  /** What the secondary button does when signed out. */
  secondary?: "login" | "labs" | "none"
  onNavigate?: () => void
}) {
  const { user, loading } = useAuth()
  const signedIn = !!user

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {!signedIn && secondary === "login" && (
        <Button asChild variant="ghost" size={size} className={cn(loading && "invisible")}>
          <Link to="/login" onClick={onNavigate}>
            Log in
          </Link>
        </Button>
      )}
      <Button asChild size={size} className={cn(loading && "invisible")}>
        <Link to={user ? (user.emailVerified ? "/dashboard" : "/verify") : "/signup"} onClick={onNavigate}>
          {signedIn ? "Go to dashboard" : "Get started"}
          <ArrowRightIcon className="transition-transform duration-150 group-hover/button:translate-x-0.5" />
        </Link>
      </Button>
      {!signedIn && secondary === "labs" && (
        <Button asChild variant="outline" size={size}>
          <a href="#labs" onClick={onNavigate}>
            See the labs
          </a>
        </Button>
      )}
    </div>
  )
}

/**
 * Sticky landing nav. Transparent at the top, gains a border + blur once you
 * scroll. Desktop links share a sliding hover highlight; mobile gets a
 * collapsible menu.
 */
export function SiteNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    const onResize = () => window.innerWidth >= 768 && setOpen(false)
    window.addEventListener("keydown", onKey)
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("resize", onResize)
    }
  }, [open])

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-200 ease-out",
        scrolled || open
          ? "border-border bg-background/80 shadow-xs backdrop-blur-md"
          : "border-transparent bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6" aria-label="Main">
        <Link
          to="/"
          onClick={() => window.scrollTo({ top: 0 })}
          className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
        >
          <Wordmark />
        </Link>

        <ul className="ml-6 hidden items-center md:flex" onMouseLeave={() => setHovered(null)}>
          {NAV_LINKS.map((link) => (
            <li key={link.href} className="relative">
              <a
                href={link.href}
                onMouseEnter={() => setHovered(link.href)}
                onFocus={() => setHovered(link.href)}
                onBlur={() => setHovered(null)}
                className="relative z-10 block rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/35"
              >
                {link.label}
              </a>
              {hovered === link.href && (
                <motion.span
                  layoutId="nav-hover"
                  className="absolute inset-0 rounded-md bg-foreground/[0.06]"
                  transition={transitions.base}
                />
              )}
            </li>
          ))}
        </ul>

        <AuthCtas size="sm" className="ml-auto hidden md:flex" />

        <Button
          variant="ghost"
          size="icon"
          className="ml-auto md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={open ? "x" : "menu"}
              initial={{ opacity: 0, rotate: -45 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 45 }}
              transition={transitions.fast}
              className="grid place-items-center"
            >
              {open ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
            </motion.span>
          </AnimatePresence>
        </Button>
      </nav>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transitions.base}
            className="overflow-hidden border-t md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 pt-3 pb-5">
              {NAV_LINKS.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...transitions.base, delay: 0.04 * i }}
                  className="flex items-center justify-between rounded-md px-3 py-2.5 text-[0.9375rem] font-medium transition-colors hover:bg-foreground/[0.05]"
                >
                  {link.label}
                  <ArrowRightIcon className="size-4 text-muted-foreground" />
                </motion.a>
              ))}
              <AuthCtas
                className="mt-3 [&>*]:flex-1"
                onNavigate={() => setOpen(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
