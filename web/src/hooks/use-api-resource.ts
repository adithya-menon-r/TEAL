import { useCallback, useEffect, useState } from "react"

type ResourceState<T> = { key: number; data?: T; error?: unknown }

/**
 * Loads `fetcher` on mount and again whenever `reload()` is called or
 * `refreshKey` changes. The previous data stays visible while a reload is in
 * flight, so lists don't flash back to skeletons.
 * `fetcher` must be stable (a module-level function).
 */
export function useApiResource<T>(fetcher: (signal: AbortSignal) => Promise<T>, refreshKey = 0) {
  const [localKey, setLocalKey] = useState(0)
  const key = refreshKey * 1_000_000 + localKey
  const [state, setState] = useState<ResourceState<T>>({ key: -1 })

  useEffect(() => {
    const controller = new AbortController()
    fetcher(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ key, data })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setState((prev) => ({ key, data: prev.data, error }))
      }
    )
    return () => controller.abort()
  }, [fetcher, key])

  const reload = useCallback(() => setLocalKey((k) => k + 1), [])

  return {
    data: state.data,
    error: state.key === key ? state.error : undefined,
    /** True until the first response (or error) for the current key arrives. */
    loading: state.key !== key,
    reload,
  }
}
