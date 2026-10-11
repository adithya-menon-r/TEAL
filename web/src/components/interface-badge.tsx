import { Badge } from "@/components/ui/badge"
import { interfaceLabel } from "@/lib/format"
import type { TemplateInterface } from "@/lib/types"

/** Badge naming a lab interface (Terminal, VS Code, JupyterLab). */
export function InterfaceBadge({ interface: iface }: { interface: TemplateInterface }) {
  const label = interfaceLabel(iface)
  if (!label) return null
  return (
    <Badge variant={iface === "jupyter" ? "accent" : iface === "vscode" ? "info" : "outline"} mono>
      {label}
    </Badge>
  )
}
