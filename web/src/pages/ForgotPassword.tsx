import { useState, type FormEvent } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeftIcon, MailCheckIcon } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import { useAuth } from "@/auth/context"
import { FormField } from "@/components/form-field"
import { AuthLayout } from "@/components/layout/auth-layout"
import { Notice } from "@/components/notice"
import { Button } from "@/components/ui/button"
import { authErrorMessage } from "@/lib/auth-errors"
import { EMAIL_DOMAIN_HINT, emailError, normalizeEmail } from "@/lib/email"
import { collapse, transitions } from "@/lib/motion"

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState(
    () => (location.state as { email?: string } | null)?.email ?? ""
  )
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const emailErr = submitted ? emailError(email) : null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    setFormError(null)
    if (emailError(email)) return
    setSubmitting(true)
    try {
      await sendPasswordReset(email)
      setSentTo(normalizeEmail(email))
    } catch (error) {
      setFormError(authErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Password reset"
      title={sentTo ? "Check your email" : "Forgot your password?"}
      description={
        sentTo
          ? undefined
          : "Enter your student email and we'll send you a link to choose a new password."
      }
      footer={
        <Link
          to="/login"
          className="group inline-flex items-center gap-1.5 font-semibold text-primary-ink underline-offset-4 hover:underline"
        >
          <ArrowLeftIcon className="size-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
          Back to log in
        </Link>
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {sentTo ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transitions.base}
            className="flex flex-col gap-5"
          >
            <Notice tone="success" title="Reset link sent">
              If an account exists for <span className="font-semibold text-foreground">{sentTo}</span>,
              a reset link is on its way. Check Junk if you don't see it in a minute.
            </Notice>
            <Button variant="outline" onClick={() => setSentTo(null)}>
              <MailCheckIcon />
              Use a different email
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={onSubmit}
            noValidate
            className="flex flex-col gap-5"
            exit={{ opacity: 0, y: -6, transition: transitions.fast }}
          >
            <AnimatePresence initial={false}>
              {formError && (
                <motion.div variants={collapse} initial="hidden" animate="visible" exit="exit">
                  <Notice tone="danger">{formError}</Notice>
                </motion.div>
              )}
            </AnimatePresence>
            <FormField
              label="Student email"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={EMAIL_DOMAIN_HINT}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailErr}
              autoFocus
            />
            <Button type="submit" size="lg" loading={submitting} className="w-full">
              Send reset link
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthLayout>
  )
}
