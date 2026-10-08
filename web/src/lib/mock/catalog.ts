import type { Template } from "@/lib/types"

/** Mock-mode copy of templates/catalog.json (PLAN.md §10); real data comes from GET /api/templates. */

// Cloud Run instance-based prices, asia-south1 (infra/api.env.yaml).
export const PRICE_VCPU_SEC = 0.000018
export const PRICE_GIB_SEC = 0.000002

/** "4Gi" → 4, "512Mi" → 0.5 */
export function memoryToGiB(memory: string): number {
  const m = /^(\d+(?:\.\d+)?)(Gi|Mi)$/.exec(memory.trim())
  if (!m) return Number.parseFloat(memory) || 0
  const n = Number.parseFloat(m[1])
  return m[2] === "Mi" ? n / 1024 : n
}

/** Mirrors backend/app/cost.py `session_cost` (PLAN.md §9.5). */
export function sessionCost(cpu: string, memory: string, seconds: number): number {
  const rate = Number.parseFloat(cpu) * PRICE_VCPU_SEC + memoryToGiB(memory) * PRICE_GIB_SEC
  return Math.max(0, seconds) * rate
}

/** Mirrors backend/app/cost.py `hourly_cost`. */
export function hourlyCost(cpu: string, memory: string): number {
  return sessionCost(cpu, memory, 3600)
}

type CatalogEntry = Omit<Template, "approxCostUsd">

const entries: CatalogEntry[] = [
  {
    id: "linux",
    name: "Linux Lab",
    description: "A clean Ubuntu shell with common command-line and build tools.",
    interface: "terminal",
    tools: [
      "bash",
      "gcc / make (build-essential)",
      "python3",
      "pip3",
      "vim",
      "nano",
      "git",
      "tmux",
      "curl",
    ],
    cpu: "1",
    memory: "1Gi",
    durationMinutes: 60,
  },
  {
    id: "pfl",
    name: "PFL: Principles of Functional Languages",
    description:
      "Haskell toolchain installed with GHCup: compile with ghc, experiment in ghci, build projects with cabal or stack.",
    interface: "terminal",
    tools: [
      "GHC 9.x (GHCup recommended)",
      "GHCi",
      "cabal",
      "stack",
      "GHCup",
      "vim",
      "nano",
      "git",
      "tmux",
    ],
    cpu: "1",
    memory: "2Gi",
    durationMinutes: 60,
  },
  {
    id: "nndl",
    name: "NNDL - Neural Networks & Deep Learning",
    description: "JupyterLab with TensorFlow (CPU) and Keras.",
    interface: "jupyter",
    tools: [
      "Python 3.12",
      "JupyterLab",
      "TensorFlow (CPU)",
      "Keras",
      "numpy",
      "pandas",
      "matplotlib",
      "scikit-learn",
    ],
    cpu: "2",
    memory: "4Gi",
    durationMinutes: 60,
  },
]

export const LAB_CATALOG: Template[] = entries.map((t) => ({
  ...t,
  approxCostUsd: Math.round(hourlyCost(t.cpu, t.memory) * 1000) / 1000,
}))
