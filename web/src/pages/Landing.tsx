import { Faq } from "@/components/landing/faq"
import { Features } from "@/components/landing/features"
import { CtaBand, SiteFooter } from "@/components/landing/footer"
import { Hero } from "@/components/landing/hero"
import { HowItWorks } from "@/components/landing/how-it-works"
import { LabsSection } from "@/components/landing/labs-section"
import { SiteNav } from "@/components/landing/site-nav"

/** Public landing page at `/` (visible signed in or out). */
export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <LabsSection />
        <Features />
        <Faq />
        <CtaBand />
      </main>
      <SiteFooter />
    </div>
  )
}
