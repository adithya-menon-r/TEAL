import { useState } from "react"
import { FlaskConicalIcon, XIcon } from "lucide-react"

import { mockFlags } from "@/lib/mock/storage"

/** Small fixed pill reminding developers that mock mode is on (VITE_MOCK=1). */
export function MockBadge() {
  const [hidden, setHidden] = useState(false)
  const [flags] = useState(mockFlags)
  if (hidden) return null
  return (
    <div className="fixed bottom-3 left-3 z-50 flex items-center gap-1.5 rounded-full border border-accent/40 bg-popover/95 py-1 pr-1 pl-2.5 font-mono text-[0.6875rem] text-accent-ink shadow-md backdrop-blur animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <FlaskConicalIcon className="size-3" aria-hidden />
      <span>
        MOCK{flags.length > 0 && <span className="text-muted-foreground"> · {flags.join(", ")}</span>}
      </span>
      <button
        type="button"
        onClick={() => setHidden(true)}
        aria-label="Hide mock mode badge"
        className="grid size-5 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <XIcon className="size-3" />
      </button>
    </div>
  )
}
