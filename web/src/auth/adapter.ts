import type { AuthAdapter } from "@/auth/types"
import { isMock } from "@/lib/env"

let adapterPromise: Promise<AuthAdapter> | undefined

/**
 * Loads the auth implementation lazily so the Firebase SDK is split into its
 * own chunk (and never downloaded in mock mode).
 */
export function loadAuthAdapter(): Promise<AuthAdapter> {
  adapterPromise ??= isMock
    ? import("@/lib/mock/auth").then((m) => m.mockAuthAdapter)
    : import("@/auth/firebase-adapter").then((m) => m.firebaseAdapter)
  return adapterPromise
}
