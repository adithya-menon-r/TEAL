import type { EndReason, Template, TemplateInterface } from "@/lib/types"

/** 3725000 → "1:02:05", 59000 → "00:59", 0 → "00:00" */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, "0")
  const ss = String(s).padStart(2, "0")
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** USD with enough precision for sub-cent lab costs: 0.0723 → "$0.072" */
export function formatUsd(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return "—"
  if (value === 0) return "$0.00"
  if (value < 0.01) return `$${value.toFixed(4)}`
  if (value < 1) return `$${value.toFixed(3)}`
  return `$${value.toFixed(2)}`
}

/** Duration between two RFC 3339 timestamps as "42 min" / "1 h 02 min" / "35 s". */
export function formatDuration(startIso: string, endIso?: string): string {
  if (!endIso) return "—"
  const seconds = Math.max(0, Math.round((Date.parse(endIso) - Date.parse(startIso)) / 1000))
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  return `${h} h ${String(minutes % 60).padStart(2, "0")} min`
}

const dateTimeFmt = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
})
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" })

/** "7 Oct, 15:42" */
export function formatDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso))
}

/** "15:42" */
export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso))
}

/** "1 vCPU · 2 GiB" */
export function formatResources(t: Pick<Template, "cpu" | "memory">): string {
  const cpu = `${t.cpu} vCPU`
  const mem = t.memory.replace(/Gi$/, " GiB").replace(/Mi$/, " MiB")
  return `${cpu} · ${mem}`
}

export const END_REASON_LABEL: Record<EndReason, string> = {
  user: "Ended by you",
  expired: "Time ran out",
  deleted: "Stopped by admin",
  failed: "Failed to start",
}

const INTERFACE_LABELS: Record<TemplateInterface, string> = {
  terminal: "Terminal",
  jupyter: "JupyterLab",
  vscode: "VS Code",
}

/** "vscode" → "VS Code"; unknown/missing values give "". */
export function interfaceLabel(iface: string | undefined): string {
  return (iface && INTERFACE_LABELS[iface as TemplateInterface]) || ""
}
