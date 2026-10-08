import { useEffect } from "react"
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom"

import { AuthProvider } from "@/auth/AuthProvider"
import { PublicOnly, RequireUnverified, RequireVerified } from "@/auth/guards"
import { AppShell } from "@/components/layout/app-shell"
import { Toaster } from "@/components/ui/sonner"
import CheckInboxPage from "@/pages/CheckInbox"
import DashboardPage from "@/pages/Dashboard"
import ForgotPasswordPage from "@/pages/ForgotPassword"
import LandingPage from "@/pages/Landing"
import LoginPage from "@/pages/Login"
import NotFoundPage from "@/pages/NotFound"
import SignupPage from "@/pages/Signup"

/** Reset scroll on page changes (but let #anchors scroll themselves). */
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, behavior: "instant" })
  }, [pathname, hash])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />

          {/* Signed-out only */}
          <Route element={<PublicOnly />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot" element={<ForgotPasswordPage />} />
          </Route>

          {/* Signed in, email not verified yet */}
          <Route element={<RequireUnverified />}>
            <Route path="/verify" element={<CheckInboxPage />} />
          </Route>

          {/* Signed in + verified */}
          <Route element={<RequireVerified />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Toaster position="bottom-right" closeButton />
      </AuthProvider>
    </BrowserRouter>
  )
}
