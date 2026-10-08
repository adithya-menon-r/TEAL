import type { ComponentType } from "react"
import { LambdaIcon, SquareTerminalIcon } from "lucide-react"
import { siLinux } from "simple-icons"

function LinuxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d={siLinux.path} />
    </svg>
  )
}

type LabIconComponent = ComponentType<{ className?: string }>

function NeuralNetworkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <g className="stroke-current/35" strokeWidth="1.1">
        <path d="M6 8 16 5M6 8l10 11M6 8l10 22M6 24 16 5M6 24l10 11M6 24l10-5" />
        <path d="m16 5 10 3m-10 5 10-4m-10 4 10 12M16 19l10-8m-10 8 10 5m-10 8 10-5" />
      </g>
      <g className="fill-primary-soft stroke-current" strokeWidth="1.4">
        <circle cx="6" cy="8" r="2.3" />
        <circle cx="6" cy="24" r="2.3" />
        <circle cx="16" cy="5" r="2.3" />
        <circle cx="16" cy="16" r="2.3" />
        <circle cx="16" cy="27" r="2.3" />
        <circle cx="26" cy="8" r="2.3" />
        <circle cx="26" cy="24" r="2.3" />
      </g>
    </svg>
  )
}

const LAB_ICON: Record<string, LabIconComponent> = {
  linux: LinuxIcon,
  pfl: LambdaIcon,
  nndl: NeuralNetworkIcon,
}

/** Icon for a catalog template id (terminal icon for unknown ids). */
export function LabIcon({ id, className }: { id: string; className?: string }) {
  const Icon = LAB_ICON[id] ?? SquareTerminalIcon
  return <Icon className={className} aria-hidden />
}
