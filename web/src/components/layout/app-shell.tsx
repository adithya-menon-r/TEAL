import { useState } from "react"
import { LogOutIcon } from "lucide-react"
import { Link, Outlet, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { useAuth } from "@/auth/context"
import { Wordmark } from "@/components/brand/wordmark"
import { Button } from "@/components/ui/button"
import { authErrorMessage } from "@/lib/auth-errors"

/** Signed-in chrome: sticky header (wordmark, email, Logout) + page container. */
export function AppShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  async function onLogout() {
    setSigningOut(true)
    try {
      await signOut()
      navigate("/login", { replace: true })
    } catch (error) {
      toast.error(authErrorMessage(error))
      setSigningOut(false)
    }
  }

  const initial = user?.email?.[0]?.toUpperCase() ?? "?"

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link
            to="/"
            className="flex shrink-0 items-center rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
          >
            <Wordmark />
          </Link>

          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            <div
              className="flex min-w-0 items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-1"
              title={user?.email}
            >
              <span
                aria-hidden
                className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft font-mono text-[0.6875rem] font-semibold text-accent-ink"
              >
                {initial}
              </span>
              <span className="sr-only">Signed in as </span>
              <span className="truncate font-mono text-xs text-foreground max-sm:max-w-[9.5rem] sm:max-w-[18rem]">
                {user?.email}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              loading={signingOut}
              aria-label="Log out"
              className="max-sm:px-2"
            >
              <LogOutIcon />
              <span className="max-sm:sr-only">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t">
        <div className="mx-auto w-full max-w-6xl px-4 py-3 text-center text-xs text-muted-foreground sm:px-6">
          <span>© {new Date().getFullYear()} TEAL</span>
        </div>
      </footer>
    </div>
  )
}
