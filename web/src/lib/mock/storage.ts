/**
 * sessionStorage helpers for mock mode. State survives a page refresh but is
 * per-tab and disappears when the tab closes. Every access is guarded because
 * storage can throw (private mode, blocked site data).
 */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore: mock state just won't persist
  }
}

export function removeKey(key: string): void {
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function delay(minMs: number, maxMs = minMs): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs)
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

/** 10 random lowercase letters/digits, first char a letter (PLAN.md §5.4). */
export function randomId(length = 10): string {
  const letters = "abcdefghijklmnopqrstuvwxyz"
  const chars = letters + "0123456789"
  let id = letters[Math.floor(Math.random() * letters.length)]
  for (let i = 1; i < length; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

// ---------------------------------------------------------------------------
// Forced scenarios: `?mock=<flag>[,<flag>…]` on any URL. Remembered for the tab
// so client-side navigation keeps them; `?mock=none` clears them.
// ---------------------------------------------------------------------------

export const MOCK_FLAGS = [
  "launches_disabled", // POST /api/sessions → 403
  "capacity_full", // POST /api/sessions → 429
  "provision_failed", // POST /api/sessions → 502
  "unknown_template", // POST /api/sessions → 404
  "start_failed", // launch succeeds, then the session turns `failed` while starting
  "short", // labs last 3 minutes (to see the amber/red countdown quickly)
  "slow", // every mock request takes ~2.5 s (to see loading states)
  "offline", // every mock request fails with a network error
] as const

export type MockFlag = (typeof MOCK_FLAGS)[number]

const FLAGS_KEY = "teal.mock.flags"

/** Reads `?mock=` from the current URL and stores it. Call once at startup. */
export function captureMockFlags(): void {
  const param = new URLSearchParams(window.location.search).get("mock")
  if (param === null) return
  const flags = param
    .split(",")
    .map((f) => f.trim())
    .filter((f): f is MockFlag => (MOCK_FLAGS as readonly string[]).includes(f))
  if (flags.length === 0) removeKey(FLAGS_KEY)
  else writeJson(FLAGS_KEY, flags)
}

export function mockFlags(): MockFlag[] {
  return readJson<MockFlag[]>(FLAGS_KEY, [])
}

export function hasMockFlag(flag: MockFlag): boolean {
  return mockFlags().includes(flag)
}
