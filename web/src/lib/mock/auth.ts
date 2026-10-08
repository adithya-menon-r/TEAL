import type { AuthAdapter, AuthUser } from "@/auth/types"
import { isAllowedEmail, normalizeEmail } from "@/lib/email"
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/mock/constants"
import { delay, randomId, readJson, writeJson } from "@/lib/mock/storage"

/**
 * In-memory Firebase stand-in for `VITE_MOCK=1`.
 *
 * - Starts signed in as DEMO_EMAIL (verified) so the dashboard is one click away.
 * - Sign up → unverified user → /verify; "I've verified" marks it verified
 *   (as if the email link was clicked).
 * - Sign in with an unknown allowed email creates a verified account on the fly
 *   with that password. Emails starting with "unverified" stay unverified.
 * - A known email with the wrong password → auth/invalid-credential.
 * State lives in sessionStorage so a refresh keeps you signed in.
 */


type Account = { uid: string; password: string; verified: boolean }
type State = { current: string | null; accounts: Record<string, Account> }

const KEY = "teal.mock.auth"

function load(): State {
  return readJson<State>(KEY, {
    current: DEMO_EMAIL,
    accounts: { [DEMO_EMAIL]: { uid: "demo-uid-0001", password: DEMO_PASSWORD, verified: true } },
  })
}

let state = load()
const listeners = new Set<(user: AuthUser | null) => void>()

function currentUser(): AuthUser | null {
  if (!state.current) return null
  const acc = state.accounts[state.current]
  if (!acc) return null
  return { uid: acc.uid, email: state.current, emailVerified: acc.verified }
}

function commit(next: State) {
  state = next
  writeJson(KEY, state)
  const user = currentUser()
  listeners.forEach((cb) => cb(user))
}

function fail(code: string, message = code): never {
  throw Object.assign(new Error(message), { code })
}

function logEmail(kind: string, email: string) {
  console.info(`[mock auth] ${kind} email "sent" to ${email}`)
}

/** Token format understood by the mock API: mock.<base64 json>. */
function makeToken(user: AuthUser): string {
  return `mock.${btoa(JSON.stringify(user))}`
}

export function parseMockToken(token: string): AuthUser | null {
  if (!token.startsWith("mock.")) return null
  try {
    return JSON.parse(atob(token.slice(5))) as AuthUser
  } catch {
    return null
  }
}

export const mockAuthAdapter: AuthAdapter = {
  onChange(callback) {
    listeners.add(callback)
    const timer = window.setTimeout(() => callback(currentUser()), 120)
    return () => {
      window.clearTimeout(timer)
      listeners.delete(callback)
    }
  },

  async signUp(rawEmail, password) {
    await delay(500, 800)
    const email = normalizeEmail(rawEmail)
    if (!email.includes("@")) fail("auth/invalid-email")
    if (password.length < 6) fail("auth/weak-password")
    if (state.accounts[email]) fail("auth/email-already-in-use")
    commit({
      current: email,
      accounts: { ...state.accounts, [email]: { uid: `mock-${randomId(12)}`, password, verified: false } },
    })
    logEmail("Verification", email)
    return currentUser()!
  },

  async signIn(rawEmail, password) {
    await delay(450, 750)
    const email = normalizeEmail(rawEmail)
    if (!email.includes("@")) fail("auth/invalid-email")
    if (!password) fail("auth/missing-password")
    const existing = state.accounts[email]
    if (existing) {
      if (existing.password !== password) fail("auth/invalid-credential")
      commit({ ...state, current: email })
    } else {
      if (!isAllowedEmail(email)) fail("auth/invalid-credential")
      const verified = !email.startsWith("unverified")
      commit({
        current: email,
        accounts: { ...state.accounts, [email]: { uid: `mock-${randomId(12)}`, password, verified } },
      })
    }
    return currentUser()!
  },

  async signOut() {
    await delay(150)
    commit({ ...state, current: null })
  },

  async sendVerification() {
    await delay(400, 700)
    const user = currentUser()
    if (!user) fail("auth/no-current-user")
    logEmail("Verification", user.email)
  },

  async sendPasswordReset(rawEmail) {
    await delay(500, 800)
    const email = normalizeEmail(rawEmail)
    if (!email.includes("@")) fail("auth/invalid-email")
    logEmail("Password reset", email)
  },

  async refresh() {
    await delay(500, 900)
    const user = currentUser()
    if (!user) return null
    if (!user.emailVerified) {
      // Simulate the student having clicked the link in the email.
      const acc = state.accounts[user.email]
      commit({ ...state, accounts: { ...state.accounts, [user.email]: { ...acc, verified: true } } })
    }
    return currentUser()
  },

  async getIdToken() {
    const user = currentUser()
    return user ? makeToken(user) : null
  },
}
