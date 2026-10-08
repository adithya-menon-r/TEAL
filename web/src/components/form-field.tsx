import { useId, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "motion/react"
import { EyeIcon, EyeOffIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { collapse } from "@/lib/motion"
import { cn } from "@/lib/utils"

type FormFieldProps = Omit<React.ComponentProps<"input">, "id"> & {
  label: string
  /** Helper text under the input (hidden while an error shows). */
  hint?: ReactNode
  /** Error text; animates in and marks the input aria-invalid. */
  error?: string | null
  /** Right side of the label row, e.g. a "Forgot password?" link. */
  labelAside?: ReactNode
  /** Render a password input with a show/hide toggle. */
  password?: boolean
}

/** Label + input + animated hint/error, wired up for screen readers. */
export function FormField({
  label,
  hint,
  error,
  labelAside,
  password = false,
  className,
  type,
  ...inputProps
}: FormFieldProps) {
  const id = useId()
  const messageId = `${id}-msg`
  const [revealed, setRevealed] = useState(false)
  const message = error || hint
  const inputType = password ? (revealed ? "text" : "password") : type

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-[0.8125rem] font-semibold">
          {label}
        </Label>
        {labelAside}
      </div>
      <div className="relative">
        <Input
          id={id}
          type={inputType}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(password && "pr-11")}
          {...inputProps}
        />
        {password && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-md text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:text-primary-ink focus-visible:ring-[3px] focus-visible:ring-ring/30"
          >
            {revealed ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        )}
      </div>
      <AnimatePresence initial={false} mode="popLayout">
        {message && (
          <motion.p
            key={error ? `e:${error}` : "hint"}
            id={messageId}
            variants={collapse}
            initial="hidden"
            animate="visible"
            exit="exit"
            role={error ? "alert" : undefined}
            className={cn(
              "overflow-hidden text-[0.8125rem] leading-snug",
              error ? "font-medium text-danger" : "text-muted-foreground"
            )}
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
