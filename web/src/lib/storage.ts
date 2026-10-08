/**
 * Small sessionStorage flags for per-tab UI memory (warning toasts already
 * shown, failed launches already dismissed). Storage can throw (private mode,
 * blocked site data), so every access is guarded and failures are ignored.
 */
export function hasFlag(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === "1"
  } catch {
    return false
  }
}

export function setFlag(key: string): void {
  try {
    window.sessionStorage.setItem(key, "1")
  } catch {
    // ignore: worst case the UI repeats itself after a refresh
  }
}
