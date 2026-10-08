/**
 * Typed access to the VITE_* build-time variables (see web/.env.example).
 * All values are public by design; nothing secret belongs here.
 */
export const env = {
  /** `VITE_MOCK=1` swaps Firebase and teal-api for in-browser fakes. */
  mock: import.meta.env.VITE_MOCK === "1" || import.meta.env.VITE_MOCK === "true",
  apiUrl: (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, ""),
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
  },
} as const

export const isMock = env.mock
