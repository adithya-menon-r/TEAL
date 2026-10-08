import type { ReactNode } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CircleCheckIcon, InfoIcon, OctagonAlertIcon, TriangleAlertIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const noticeVariants = cva(
  "flex items-start gap-3 rounded-md border px-3.5 py-3 text-sm leading-relaxed",
  {
    variants: {
      tone: {
        info: "border-border bg-card text-foreground [&_[data-icon]]:text-muted-foreground",
        success: "border-primary/25 bg-primary-soft text-foreground [&_[data-icon]]:text-primary-ink",
        warning: "border-warning/25 bg-warning-soft text-foreground [&_[data-icon]]:text-warning",
        danger: "border-danger/25 bg-danger-soft text-foreground [&_[data-icon]]:text-danger",
      },
    },
    defaultVariants: { tone: "info" },
  }
)

const ICONS = {
  info: InfoIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
  danger: OctagonAlertIcon,
}

type NoticeProps = VariantProps<typeof noticeVariants> & {
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  className?: string
}

/** Inline callout for form errors, paused launches, etc. */
export function Notice({ tone = "info", title, children, action, className }: NoticeProps) {
  const Icon = ICONS[tone ?? "info"]
  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={cn(noticeVariants({ tone }), className)}
    >
      <Icon data-icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5 text-muted-foreground")}>{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  )
}
