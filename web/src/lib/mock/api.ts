import { LAB_CATALOG, sessionCost } from "@/lib/catalog"
import { isAllowedEmail } from "@/lib/email"
import { parseMockToken } from "@/lib/mock/auth"
import { delay, hasMockFlag, randomId, readJson, writeJson } from "@/lib/mock/storage"
import type { ApiErrorBody, EndReason, Session, Template } from "@/lib/types"

/**
 * In-browser teal-api for VITE_MOCK=1, implementing every PLAN.md §8.1
 * student endpoint. `apiFetch` calls `mockFetch` instead of `fetch`, so the
 * real response parsing and error handling run unchanged.
 *
 * Behaviour
 * - Launch → `starting` for ~8 s, then `running` with an `accessUrl` (on GET /api/session).
 * - Second launch while one is active → 409 active_session {session}.
 * - DELETE /api/session → `ended` with `costUsd`, moved into history.
 * - Labs past `expiresAt` end with reason `expired`.
 * - Force failures with `?mock=<flag>` (see MOCK_FLAGS in storage.ts).
 * State is per user in sessionStorage, so a refresh keeps the active lab.
 */

const READY_AFTER_MS = 8_000
const FAIL_AFTER_MS = 6_000
/** How long a failed session is still reported by GET /api/session. */
const FAILED_VISIBLE_MS = 60_000

type StoredSession = Session & { cpu: string; memory: string }
type State = { active: StoredSession | null; history: Session[] }

const stateKey = (uid: string) => `teal.mock.api.${uid}`

const iso = (ms: number) => new Date(ms).toISOString()

function findTemplate(id: string): Template | undefined {
  return LAB_CATALOG.find((t) => t.id === id)
}

function seedHistory(): Session[] {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const past = (
    templateId: string,
    startedAgoMs: number,
    minutes: number,
    endReason: EndReason
  ): Session => {
    const t = findTemplate(templateId)!
    const createdAt = now - startedAgoMs
    const endedAt = createdAt + minutes * 60_000
    return {
      id: randomId(),
      templateId,
      templateName: t.name,
      status: "ended",
      endReason,
      createdAt: iso(createdAt),
      expiresAt: iso(createdAt + t.durationMinutes * 60_000),
      endedAt: iso(endedAt),
      costUsd: round(sessionCost(t.cpu, t.memory, (endedAt - createdAt) / 1000)),
    }
  }
  return [
    past("pfl", 1 * day + 3 * 3600_000, 42, "user"),
    past("linux", 2 * day + 5 * 3600_000, 60, "expired"),
    past("nndl", 4 * day + 1 * 3600_000, 27, "user"),
    past("pfl", 6 * day + 2 * 3600_000, 51, "user"),
    { ...past("linux", 8 * day, 5, "failed"), status: "failed" },
  ]
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000
}

function load(uid: string): State {
  const state = readJson<State | null>(stateKey(uid), null)
  if (state) return state
  const fresh: State = { active: null, history: seedHistory() }
  writeJson(stateKey(uid), fresh)
  return fresh
}

function save(uid: string, state: State) {
  writeJson(stateKey(uid), state)
}

function publicSession(s: StoredSession): Session {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { cpu, memory, ...rest } = s
  return rest
}

function endActive(state: State, reason: EndReason, at = Date.now()): Session {
  const active = state.active!
  const endedAtMs = Math.min(at, Date.parse(active.expiresAt))
  const seconds = (endedAtMs - Date.parse(active.createdAt)) / 1000
  const ended: Session = {
    ...publicSession(active),
    status: reason === "failed" ? "failed" : "ended",
    endReason: reason,
    endedAt: iso(endedAtMs),
    costUsd: round(sessionCost(active.cpu, active.memory, seconds)),
    accessUrl: undefined,
  }
  state.active = null
  state.history = [ended, ...state.history].slice(0, 25)
  return ended
}

/** The equivalent of the backend's ready check + reaper, run on every request. */
function advance(state: State) {
  const a = state.active
  if (!a) return
  const now = Date.now()
  const age = now - Date.parse(a.createdAt)
  if (a.status === "starting" && hasMockFlag("start_failed") && age >= FAIL_AFTER_MS) {
    endActive(state, "failed", now)
    return
  }
  if (now >= Date.parse(a.expiresAt)) {
    endActive(state, "expired", now)
    return
  }
  if (a.status === "starting" && age >= READY_AFTER_MS) {
    a.status = "running"
    a.accessUrl = `https://lab-${a.id}-x7k2p9qa3q-el.a.run.app/#t=${randomId(32)}`
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function error(status: number, code: string, message: string, extra?: Partial<ApiErrorBody>) {
  return json(status, { error: code, message, ...extra })
}

export async function mockFetch(url: string, init: RequestInit): Promise<Response> {
  await delay(hasMockFlag("slow") ? 2200 : 250, hasMockFlag("slow") ? 2800 : 600)
  if (hasMockFlag("offline")) throw new TypeError("Failed to fetch")

  const method = (init.method ?? "GET").toUpperCase()
  const path = new URL(url, window.location.origin).pathname

  // Auth middleware (PLAN.md §6.2)
  const auth = new Headers(init.headers).get("Authorization") ?? ""
  const user = parseMockToken(auth.replace(/^Bearer\s+/i, ""))
  if (!user) return error(401, "unauthenticated", "Missing or invalid ID token.")
  if (!isAllowedEmail(user.email)) {
    return error(403, "domain_not_allowed", "Only Amrita student accounts can use TEAL.")
  }
  if (!user.emailVerified) {
    return error(403, "email_not_verified", "Verify your email address first.")
  }

  const state = load(user.uid)
  advance(state)

  try {
    if (method === "GET" && path === "/api/me") {
      return json(200, { email: user.email, uid: user.uid })
    }

    if (method === "GET" && path === "/api/templates") {
      return json(200, { templates: LAB_CATALOG })
    }

    if (method === "GET" && path === "/api/session") {
      if (state.active) return json(200, { session: publicSession(state.active) })
      const last = state.history[0]
      if (
        last?.status === "failed" &&
        last.endedAt &&
        Date.now() - Date.parse(last.endedAt) < FAILED_VISIBLE_MS
      ) {
        return json(200, { session: last })
      }
      return json(200, { session: null })
    }

    if (method === "POST" && path === "/api/sessions") {
      const body = JSON.parse(String(init.body ?? "{}")) as { templateId?: string }
      const template = findTemplate(body.templateId ?? "")
      if (!template || hasMockFlag("unknown_template")) {
        return error(404, "unknown_template", `Unknown template "${body.templateId}".`)
      }
      if (hasMockFlag("launches_disabled")) {
        return error(403, "launches_disabled", "Launches are paused, try again later.")
      }
      if (hasMockFlag("capacity_full")) {
        return error(429, "capacity_full", "All lab slots are busy, try again in a few minutes.")
      }
      if (state.active) {
        return error(409, "active_session", "You already have an active lab.", {
          session: publicSession(state.active),
        })
      }
      if (hasMockFlag("provision_failed")) {
        return error(502, "provision_failed", "Could not create the lab. Please try again.")
      }
      const now = Date.now()
      const minutes = hasMockFlag("short") ? 3 : template.durationMinutes
      state.active = {
        id: randomId(),
        templateId: template.id,
        templateName: template.name,
        status: "starting",
        createdAt: iso(now),
        expiresAt: iso(now + minutes * 60_000),
        cpu: template.cpu,
        memory: template.memory,
      }
      return json(202, { session: publicSession(state.active) })
    }

    if (method === "DELETE" && path === "/api/session") {
      if (!state.active) return error(404, "no_active_session", "No active lab.")
      const ended = endActive(state, "user")
      return json(200, { session: ended })
    }

    if (method === "GET" && path === "/api/sessions/history") {
      return json(200, { sessions: state.history.slice(0, 10) })
    }

    return error(404, "not_found", `No mock route for ${method} ${path}.`)
  } finally {
    save(user.uid, state)
  }
}
