import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { CheckIcon, MailIcon, RotateCwIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { useAuth } from "@/auth/context"
import { AuthLayout } from "@/components/layout/auth-layout"
import { Notice } from "@/components/notice"
import { Button } from "@/components/ui/button"
import { RESEND_COOLDOWN_KEY, RESEND_COOLDOWN_SECONDS, useCooldown } from "@/hooks/use-cooldown"
import { authErrorMessage } from "@/lib/auth-errors"
import { formatCountdown } from "@/lib/format"
import { collapse } from "@/lib/motion"
import { usePageTitle } from "@/hooks/use-page-title"

/** Animated envelope with a pulsing ring: "we're waiting for you". */
function InboxIllustration() {
  return (
    <div className="relative grid size-12 place-items-center">
      <span className="absolute inset-0 rounded-lg bg-primary/15 animate-status-ping [animation-duration:2.4s] motion-reduce:hidden" />
      <span className="relative grid size-12 place-items-center rounded-lg border border-primary/25 bg-primary-soft text-primary-ink">
        <MailIcon className="size-5" />
      </span>
    </div>
  )
}

export default function CheckInboxPage() {
  usePageTitle("Check your inbox · TEAL")
  const { user, refresh, resendVerification, signOut } = useAuth()
  const navigate = useNavigate()
  const cooldown = useCooldown(RESEND_COOLDOWN_KEY, RESEND_COOLDOWN_SECONDS)
  const [checking, setChecking] = useState(false)
  const [resending, setResending] = useState(false)
  const [notice, setNotice] = useState<{ tone: "warning" | "danger"; text: string } | null>(null)

  async function onVerified() {
    setChecking(true)
    setNotice(null)
    try {
      const fresh = await refresh()
      if (fresh?.emailVerified) {
        toast.success("Email verified. Welcome to TEAL!")
        navigate("/dashboard", { replace: true })
        return
      }
      setNotice({
        tone: "warning",
        text: "Not verified yet. Open the link in the email, then press the button again.",
      })
    } catch (error) {
      setNotice({ tone: "danger", text: authErrorMessage(error) })
    } finally {
      setChecking(false)
    }
  }

  async function onResend() {
    setResending(true)
    setNotice(null)
    try {
      await resendVerification()
      cooldown.start()
      toast.success("Verification email sent", { description: user?.email })
    } catch (error) {
      setNotice({ tone: "danger", text: authErrorMessage(error) })
    } finally {
      setResending(false)
    }
  }

  async function onSwitchAccount() {
    await signOut()
    navigate("/signup", { replace: true })
  }

  return (
    <AuthLayout
      media={<InboxIllustration />}
      eyebrow="Verify your email"
      title="Check your inbox"
      description={
        <>
          We sent a verification link to{" "}
          <span className="font-semibold [overflow-wrap:anywhere] text-foreground">
            {user?.email.split("@")[0]}@<wbr />
            {user?.email.split("@")[1]}
          </span>. Check
          Junk if you don't see it.
        </>
      }
      footer={
        <>
          Wrong email?{" "}
          <button
            type="button"
            onClick={onSwitchAccount}
            className="rounded-sm font-semibold text-primary-ink underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/35"
          >
            Sign up again
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {notice && (
            <motion.div
              key={notice.text}
              variants={collapse}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="mb-1"
            >
              <Notice tone={notice.tone}>{notice.text}</Notice>
            </motion.div>
          )}
        </AnimatePresence>

        <Button size="lg" className="w-full" loading={checking} onClick={onVerified}>
          <CheckIcon />
          I've verified
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full"
          loading={resending}
          disabled={cooldown.active}
          onClick={onResend}
        >
          <RotateCwIcon />
          {cooldown.active ? (
            <span>
              Resend in{" "}
              <span className="font-mono tabular-nums">{formatCountdown(cooldown.remaining * 1000)}</span>
            </span>
          ) : (
            "Resend email"
          )}
        </Button>
      </div>
      <ol className="mt-6 space-y-2 border-t pt-5 text-[0.8125rem] text-muted-foreground">
        {[
          "Open the email from TEAL.",
          "Click the verification link.",
          "Come back here and press “I've verified”.",
        ].map((step, i) => (
          <li key={step} className="flex items-center gap-3">
            <span className="grid size-5 shrink-0 place-items-center rounded-full border bg-popover font-mono text-[0.6875rem] text-foreground">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </AuthLayout>
  )
}
