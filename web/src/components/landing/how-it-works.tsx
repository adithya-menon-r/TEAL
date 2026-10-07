import { motion } from "motion/react"
import { CodeXmlIcon, LayoutGridIcon, MailCheckIcon } from "lucide-react"

import { SectionHeading } from "@/components/landing/section-heading"
import { MonoLabel } from "@/components/mono-label"
import { EASE_OUT, fadeSlideUp, stagger } from "@/lib/motion"

const STEPS = [
  {
    icon: MailCheckIcon,
    title: "Sign in with your Amrita email",
    body: "Create an account with your @xx.students.amrita.edu address and verify it from your inbox.",
  },
  {
    icon: LayoutGridIcon,
    title: "Pick your course lab",
    body: "Linux, PFL (Haskell) or NNDL (TensorFlow). Each comes with the course tools already installed.",
  },
  {
    icon: CodeXmlIcon,
    title: "Code in the browser",
    body: "A terminal or JupyterLab opens in a new tab. After 60 minutes the lab disappears on its own.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t bg-card/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <SectionHeading
          eyebrow="How it works"
          title="From login to a running lab in three steps"
          description="No VMs to download, no toolchains to fight with. TEAL starts a fresh, private environment for you on Google Cloud."
        />

        <motion.ol
          variants={stagger(0.12)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="relative mt-12 grid gap-4 md:grid-cols-3 md:gap-6"
        >
          {/* Connector: vertical on mobile, horizontal on md+. Draws itself in. */}
          <motion.span
            aria-hidden
            variants={{
              hidden: { scaleY: 0 },
              visible: { scaleY: 1, transition: { duration: 0.8, ease: EASE_OUT, delay: 0.1 } },
            }}
            className="absolute top-6 bottom-6 left-[2.15rem] w-px origin-top bg-[repeating-linear-gradient(to_bottom,var(--border-strong)_0_4px,transparent_4px_8px)] md:hidden"
          />
          <motion.span
            aria-hidden
            variants={{
              hidden: { scaleX: 0 },
              visible: { scaleX: 1, transition: { duration: 0.9, ease: EASE_OUT, delay: 0.1 } },
            }}
            className="absolute top-[2.15rem] right-[16%] left-[16%] hidden h-px origin-left bg-[repeating-linear-gradient(to_right,var(--border-strong)_0_4px,transparent_4px_8px)] md:block"
          />

          {STEPS.map((step, i) => (
            <motion.li
              key={step.title}
              variants={fadeSlideUp}
              className="group relative flex gap-4 md:flex-col md:items-center md:text-center"
            >
              <div className="relative z-10 grid size-[4.3rem] shrink-0 place-items-center rounded-xl border bg-card shadow-sm transition-[transform,border-color,box-shadow] duration-200 ease-out group-hover:-translate-y-0.5 group-hover:border-primary/45 group-hover:shadow-md">
                <step.icon className="size-6 text-primary-ink transition-transform duration-200 group-hover:scale-110" />
                <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full border bg-background font-mono text-[0.6875rem] font-semibold text-accent-ink">
                  {i + 1}
                </span>
              </div>
              <div className="pt-1 md:max-w-[17rem]">
                <MonoLabel>Step 0{i + 1}</MonoLabel>
                <h3 className="mt-1 text-base font-bold tracking-tight">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  )
}
