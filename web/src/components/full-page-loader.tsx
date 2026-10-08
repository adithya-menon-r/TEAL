import { LogoMark } from "@/components/brand/wordmark"

/** Shown while the first auth state loads. Fades in after 150 ms to avoid flashes. */
export function FullPageLoader() {
  return (
    <div
      role="status"
      className="grid min-h-dvh place-items-center bg-background animate-in fade-in-0 delay-150 fill-mode-both duration-300"
    >
      <div className="flex flex-col items-center gap-4">
        <LogoMark className="size-10 animate-pulse" />
        <span className="mono-label text-muted-foreground">Loading</span>
      </div>
    </div>
  )
}
