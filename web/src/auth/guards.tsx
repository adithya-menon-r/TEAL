import { Navigate, Outlet, useLocation, type Location } from "react-router-dom"

import { useAuth } from "@/auth/context"
import { FullPageLoader } from "@/components/full-page-loader"

type FromState = { from?: Location }

/** Signed out → /login; signed in but unverified → /verify; verified → render. */
export function RequireVerified() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location } satisfies FromState} />
  if (!user.emailVerified) return <Navigate to="/verify" replace />
  return <Outlet />
}

/** The "Check your inbox" screen: only for signed-in, unverified users. */
export function RequireUnverified() {
  const { user, loading } = useAuth()
  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (user.emailVerified) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

/** Login / sign up / forgot password: bounce signed-in users onwards. */
export function PublicOnly() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageLoader />
  if (user && !user.emailVerified) return <Navigate to="/verify" replace />
  if (user) {
    const from = (location.state as FromState | null)?.from
    const target = from && from.pathname !== "/login" ? from : "/dashboard"
    return <Navigate to={target} replace />
  }
  return <Outlet />
}
