import { useEffect } from "react"

const DEFAULT_TITLE = "TEAL"

export function usePageTitle(title: string) {
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous || DEFAULT_TITLE
    }
  }, [title])
}
