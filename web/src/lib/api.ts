import { loadAuthAdapter } from "@/auth/adapter"
import { env, isMock } from "@/lib/env"
import type {
  ApiErrorBody,
  ApiErrorCode,
  EndSessionResponse,
  HistoryResponse,
  LaunchResponse,
  Me,
  Session,
  SessionResponse,
  Template,
  TemplatesResponse,
} from "@/lib/types"

/**
 * teal-api client (PLAN.md §8.1). Every call sends `Authorization: Bearer
 * <Firebase ID token>`. Non-2xx responses become an `ApiError` carrying the
 * backend's `{error, message}` (plus `session` on 409 active_session).
 * With VITE_MOCK=1 requests go to an in-browser fake (src/lib/mock/api.ts)
 * through the same parsing code.
 */

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly body?: ApiErrorBody

  constructor(status: number, code: ApiErrorCode, message: string, body?: ApiErrorBody) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.body = body
  }
}

export function isApiError(error: unknown, code?: ApiErrorCode): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code)
}

type Transport = (url: string, init: RequestInit) => Promise<Response>

let transportPromise: Promise<Transport> | undefined
function getTransport(): Promise<Transport> {
  transportPromise ??= isMock
    ? import("@/lib/mock/api").then((m) => m.mockFetch)
    : Promise.resolve((url: string, init: RequestInit) => fetch(url, init))
  return transportPromise
}

type ApiFetchOptions = {
  method?: "GET" | "POST" | "DELETE"
  body?: unknown
  signal?: AbortSignal
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as ApiErrorBody).error === "string"
  )
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options

  if (!isMock && !env.apiUrl) {
    throw new ApiError(0, "not_configured", "VITE_API_URL is not set.")
  }

  const token = await (await loadAuthAdapter()).getIdToken()
  if (!token) throw new ApiError(401, "unauthenticated", "Please log in again.")

  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: "application/json" }
  if (body !== undefined) headers["Content-Type"] = "application/json"

  let res: Response
  try {
    const transport = await getTransport()
    res = await transport(`${isMock ? "" : env.apiUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw new ApiError(0, "network_error", "Can't reach TEAL right now. Check your connection and try again.")
  }

  const text = await res.text()
  let data: unknown = undefined
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = undefined
    }
  }

  if (!res.ok) {
    if (isErrorBody(data)) {
      throw new ApiError(res.status, data.error, data.message || defaultMessage(data.error), data)
    }
    throw new ApiError(res.status, "unknown_error", `Request failed (${res.status}).`)
  }

  return data as T
}

// ---------------------------------------------------------------------------
// Typed endpoints
// ---------------------------------------------------------------------------

export function getMe(signal?: AbortSignal): Promise<Me> {
  return apiFetch<Me>("/api/me", { signal })
}

export async function getTemplates(signal?: AbortSignal): Promise<Template[]> {
  return (await apiFetch<TemplatesResponse>("/api/templates", { signal })).templates
}

/** The active session, or null. Poll every 2 s while `starting`, else every 30 s. */
export async function getSession(signal?: AbortSignal): Promise<Session | null> {
  return (await apiFetch<SessionResponse>("/api/session", { signal })).session
}

/**
 * Launch a lab. Errors: 409 `active_session` (the existing session is in
 * `error.body.session`), 403 `launches_disabled`, 429 `capacity_full`,
 * 404 `unknown_template`, 502 `provision_failed`.
 */
export async function launchSession(templateId: string): Promise<Session> {
  return (await apiFetch<LaunchResponse>("/api/sessions", { method: "POST", body: { templateId } })).session
}

/** End the active lab. Returns the ended session (with `costUsd`). 404 `no_active_session`. */
export async function endSession(): Promise<Session> {
  return (await apiFetch<EndSessionResponse>("/api/session", { method: "DELETE" })).session
}

/** The student's last 10 labs, newest first. */
export async function getHistory(signal?: AbortSignal): Promise<Session[]> {
  return (await apiFetch<HistoryResponse>("/api/sessions/history", { signal })).sessions
}

// ---------------------------------------------------------------------------
// Friendly messages (PLAN.md §14 Phase 4 error states)
// ---------------------------------------------------------------------------

const FRIENDLY: Partial<Record<string, string>> = {
  launches_disabled: "Launches are paused, try again later.",
  capacity_full: "All lab slots are busy, try again in a few minutes.",
  provision_failed: "We couldn't start your lab. Please try again.",
  unknown_template: "That lab isn't available any more.",
  active_session: "You already have a lab running.",
  no_active_session: "You don't have a lab running.",
  email_not_verified: "Verify your email to use TEAL.",
  domain_not_allowed: "TEAL is only for Amrita student accounts.",
  unauthenticated: "Please log in again.",
  invalid_token: "Please log in again.",
  network_error: "Can't reach TEAL right now. Check your connection and try again.",
}

function defaultMessage(code: string): string {
  return FRIENDLY[code] ?? "Something went wrong. Please try again."
}

/** Best user-facing message for any error thrown by this module. */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return FRIENDLY[error.code] ?? error.message
  return "Something went wrong. Please try again."
}
