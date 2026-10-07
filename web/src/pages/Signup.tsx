import { useState, type FormEvent } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ArrowRightIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { useAuth } from "@/auth/context"
import { FormField } from "@/components/form-field"
import { AuthLayout, TextLink } from "@/components/layout/auth-layout"
import { Notice } from "@/components/notice"
import { Button } from "@/components/ui/button"
import { RESEND_COOLDOWN_KEY, RESEND_COOLDOWN_SECONDS, startCooldown } from "@/hooks/use-cooldown"
import { authErrorMessage } from "@/lib/auth-errors"
import { EMAIL_DOMAIN_HINT, emailError, MIN_PASSWORD_LENGTH } from "@/lib/email"
import { collapse } from "@/lib/motion"

type Errors = { email?: string | null; password?: string | null; confirm?: string | null }

function validate(email: string, password: string, confirm: string): Errors {
  return {
    email: emailError(email),
    password:
      password.length < MIN_PASSWORD_LENGTH
        ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
        : null,
    confirm: confirm !== password ? "Passwords don't match." : null,
  }
}

export default function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [touched, setTouched] = useState<Record<keyof Errors, boolean>>({
    email: false,
    password: false,
    confirm: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const errors = validate(email, password, confirm)
  const shown = (field: keyof Errors) => (touched[field] ? errors[field] : null)
  const touch = (field: keyof Errors) => setTouched((t) => ({ ...t, [field]: true }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched({ email: true, password: true, confirm: true })
    setFormError(null)
    if (errors.email || errors.password || errors.confirm) return
    setSubmitting(true)
    try {
      await signUp(email, password)
      startCooldown(RESEND_COOLDOWN_KEY, RESEND_COOLDOWN_SECONDS)
      navigate("/verify", { replace: true })
    } catch (error) {
      setFormError(authErrorMessage(error))
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Create account"
      title="Sign up for TEAL"
      description="Use your Amrita student email. We'll send a link to verify it."
      footer={
        <>
          Already have an account? <TextLink to="/login">Log in</TextLink>
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
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={EMAIL_DOMAIN_HINT}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setFormError(null)
          }}
          onBlur={() => email && touch("email")}
          error={shown("email")}
          hint={
            <>
              Format: <span className="font-mono text-[0.75rem]">{EMAIL_DOMAIN_HINT}</span>
            </>
          }
          autoFocus
        />
        <FormField
          label="Password"
          password
          name="new-password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => password && touch("password")}
          error={shown("password")}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        />
        <FormField
          label="Confirm password"
          password
          name="confirm-password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onBlur={() => confirm && touch("confirm")}
          error={shown("confirm")}
        />

        <Button type="submit" size="lg" loading={submitting} className="mt-1 w-full">
          Create account
          <ArrowRightIcon className="transition-transform duration-150 group-hover/button:translate-x-0.5" />
        </Button>
      </form>
    </AuthLayout>
  )
}
