import {
  FolderDownIcon,
  HourglassIcon,
  Layers2Icon,
  MonitorSmartphoneIcon,
  PackageXIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { SectionHeading } from "@/components/landing/section-heading"
import { Stagger, StaggerItem } from "@/components/motion"

const FEATURES = [
  {
    icon: PackageXIcon,
    title: "No installs",
    body: "No VirtualBox, WSL or toolchain setup. If you have a browser, you have the lab.",
    tag: "0 MB",
  },
  {
    icon: MonitorSmartphoneIcon,
    title: "Works on any OS",
    body: "Any OS, on a lab PC or your own laptop. Same environment everywhere.",
    tag: "any browser",
  },
  {
    icon: ShieldCheckIcon,
    title: "Isolated per student",
    body: "Every lab is a separate container behind a private link. Nobody else can see your terminal.",
    tag: "1 : 1",
  },
  {
    icon: HourglassIcon,
    title: "Auto-expires in 1 hour",
    body: "A countdown keeps you on track, with reminders at 10 and 2 minutes left. Then it cleans up.",
    tag: "60 min",
  },
  {
    icon: Layers2Icon,
    title: "One lab at a time",
    body: "Keeps things fair for everyone. Close the tab and Open Lab takes you back to the same session.",
    tag: "1 active",
  },
  {
    icon: FolderDownIcon,
    title: "Download your files",
    body: "Grab single files or your whole home folder as home.tar.gz before the lab ends.",
    tag: ".tar.gz",
  },
]

export function Features() {
  return (
    <section id="features" className="border-t bg-card/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <SectionHeading
          eyebrow="Why TEAL"
          title="Built for lab hours, not for setup"
          description="Spend the session on the exercise, not on getting the tools your course needs to install."
        />

        <Stagger
          step={0.05}
          className="mt-12 grid overflow-hidden rounded-xl border bg-border [gap:1px] sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((f) => (
            <StaggerItem
              key={f.title}
              className="group relative flex flex-col gap-3 bg-card p-6 transition-colors duration-200 hover:bg-popover sm:p-7"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-lg border bg-background text-muted-foreground transition-[color,border-color,transform] duration-200 ease-out group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:text-primary-ink">
                  <f.icon className="size-[1.15rem]" />
                </span>
                <span className="font-mono text-[0.6875rem] text-muted-foreground transition-colors duration-200 group-hover:text-accent-ink">
                  {f.tag}
                </span>
              </div>
              <h3 className="text-[0.9375rem] font-bold tracking-tight">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              {/* Accent edge that grows on hover */}
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-primary transition-transform duration-300 ease-out group-hover:scale-x-100"
              />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
