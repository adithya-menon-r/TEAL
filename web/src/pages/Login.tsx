import { useState, type FormEvent } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ArrowRightIcon, FlaskConicalIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { useAuth } from "@/auth/context"
import { FormField } from "@/components/form-field"
import { AuthLayout, TextLink } from "@/components/layout/auth-layout"
import { Notice } from "@/components/notice"
import { Button } from "@/components/ui/button"
import { authErrorMessage } from "@/lib/auth-errors"
import { EMAIL_DOMAIN_HINT, emailError } from "@/lib/email"
import { isMock } from "@/lib/env"
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/mock/constants"
import { collapse } from "@/lib/motion"
import { usePageTitle } from "@/hooks/use-page-title"

export default function LoginPage() {
  usePageTitle("Log in · TEAL")
  const { signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const emailErr = submitted ? emailError(email) : null
  const passwordErr = submitted && !password ? "Enter your password." : null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    setFormError(null)
    if (emailError(email) || !password) return
    setSubmitting(true)
    try {
      // On success the PublicOnly guard redirects (dashboard, or /verify if unverified).
      await signIn(email, password)
    } catch (error) {
      setFormError(authErrorMessage(error))
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Log in to TEAL"
      footer={
        <>
          New here? <TextLink to="/signup">Create an account</TextLink>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
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
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={EMAIL_DOMAIN_HINT}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setFormError(null)
          }}
          error={emailErr}
          autoFocus
        />
        <FormField
          label="Password"
          password
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setFormError(null)
          }}
          error={passwordErr}
          labelAside={
            <Link
              to="/forgot"
              state={{ email }}
              className="rounded-sm text-[0.8125rem] font-medium text-primary-ink underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/35"
            >
              Forgot password?
            </Link>
          }
        />

        <Button type="submit" size="lg" loading={submitting} className="mt-1 w-full">
          Log in
          <ArrowRightIcon className="transition-transform duration-150 group-hover/button:translate-x-0.5" />
        </Button>

        {isMock && (
          <div className="flex items-start gap-3 rounded-md border border-dashed border-accent/50 bg-accent-soft/50 p-3 text-[0.8125rem] leading-relaxed">
            <FlaskConicalIcon className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">Mock mode</p>
              <p className="text-muted-foreground">
                Any allowed email signs in. Emails starting with{" "}
                <code className="text-[0.75rem]">unverified</code> stay unverified.
              </p>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="mt-1"
                onClick={() => {
                  setEmail(DEMO_EMAIL)
                  setPassword(DEMO_PASSWORD)
                  setFormError(null)
                }}
              >
                Use the demo account
              </Button>
            </div>
          </div>
        )}
      </form>
    </AuthLayout>
  )
}
