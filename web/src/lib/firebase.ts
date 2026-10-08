import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"

import { env } from "@/lib/env"

/**
 * Firebase (Authentication only). Config comes from VITE_FIREBASE_* at build
 * time; these values are public by design (PLAN.md §5.2, §6.1).
 * Not imported at all in mock mode (see src/auth/adapter.ts).
 */
export function isFirebaseConfigured(): boolean {
  const c = env.firebase
  return Boolean(c.apiKey && c.authDomain && c.projectId && c.appId)
}

let app: FirebaseApp | undefined
let auth: Auth | undefined

export function getFirebaseApp(): FirebaseApp {
  if (app) return app
  if (!isFirebaseConfigured()) {
    throw Object.assign(
      new Error("Firebase is not configured. Set VITE_FIREBASE_* or run with VITE_MOCK=1."),
      { code: "app/not-configured" }
    )
  }
  app = getApps().length ? getApp() : initializeApp(env.firebase)
  return app
}

export function getFirebaseAuth(): Auth {
  if (!auth) auth = getAuth(getFirebaseApp())
  return auth
}
