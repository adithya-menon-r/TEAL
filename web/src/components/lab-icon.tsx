import { BrainCircuitIcon, LambdaIcon, SquareTerminalIcon, type LucideIcon } from "lucide-react"

const LAB_ICON: Record<string, LucideIcon> = {
  linux: SquareTerminalIcon,
  pfl: LambdaIcon,
  nndl: BrainCircuitIcon,
}

/** Icon for a catalog template id (terminal icon for unknown ids). */
export function LabIcon({ id, className }: { id: string; className?: string }) {
  const Icon = LAB_ICON[id] ?? SquareTerminalIcon
  return <Icon className={className} aria-hidden />
}
