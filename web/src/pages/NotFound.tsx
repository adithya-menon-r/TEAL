import { ArrowLeftIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { Wordmark } from "@/components/brand/wordmark"
import { FadeIn } from "@/components/motion"
import { MonoLabel } from "@/components/mono-label"
import { Button } from "@/components/ui/button"
import { usePageTitle } from "@/hooks/use-page-title"

export default function NotFoundPage() {
  usePageTitle("Page not found · TEAL")
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-dots mask-radial-fade opacity-60" />
      <FadeIn className="relative flex flex-col items-center text-center">
        <MonoLabel>Error 404</MonoLabel>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">This page doesn't exist</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Like a finished lab, it may have been cleaned up. Head back and start fresh.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">
            <ArrowLeftIcon />
            Back to Home
          </Link>
        </Button>
      </FadeIn>
    </div>
  )
}
