import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <main className="grid min-h-dvh place-items-center">
      <Button asChild>
        <Link to="/login">Log in</Link>
      </Button>
    </main>
  )
}
