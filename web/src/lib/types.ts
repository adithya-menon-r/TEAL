/** teal-api contract types (PLAN.md §8.1). Keep in sync with the backend. */

export type TemplateInterface = "terminal" | "jupyter" | "vscode"

export type Template = {
  id: string
  name: string
  description: string
  /** Ordered; the first one is the default. */
  interfaces: TemplateInterface[]
  tools: string[]
  cpu: string
  memory: string
  durationMinutes: number
  approxCostUsd: number
}

export type SessionStatus = "starting" | "running" | "ending" | "ended" | "failed"

export type EndReason = "user" | "expired" | "deleted" | "failed"

export type Session = {
  id: string
  templateId: string
  templateName: string
  /** Missing on old history items. */
  interface?: TemplateInterface
  status: SessionStatus
  endReason?: EndReason
  /** RFC 3339 */
  createdAt: string
  /** RFC 3339 */
  expiresAt: string
  /** RFC 3339 */
  endedAt?: string
  costUsd?: number
  /** Only when status = running: "https://lab-…run.app/#t=<token>" */
  accessUrl?: string
}

export type Me = {
  email: string
  uid: string
}

/** Error codes the API can return (`{"error": code, "message": text}`). */
export type ApiErrorCode =
  | "unauthenticated"
  | "invalid_token"
  | "domain_not_allowed"
  | "email_not_verified"
  | "active_session"
  | "launches_disabled"
  | "capacity_full"
  | "unknown_template"
  | "unknown_interface"
  | "provision_failed"
  | "no_active_session"
  | "network_error"
  | "unknown_error"
  // the backend may add more; keep the union open
  | (string & {})

export type ApiErrorBody = {
  error: ApiErrorCode
  message: string
  /** Present on `409 active_session`. */
  session?: Session
}

// Response envelopes
export type TemplatesResponse = { templates: Template[] }
export type SessionResponse = { session: Session | null }
export type LaunchResponse = { session: Session }
export type EndSessionResponse = { session: Session }
export type HistoryResponse = { sessions: Session[] }
