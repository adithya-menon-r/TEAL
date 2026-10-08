import { SectionHeading } from "@/components/landing/section-heading"
import { Reveal } from "@/components/motion"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const FAQS = [
  {
    q: "What happens to my files when the lab ends?",
    a: "They are deleted along with the lab. Nothing is kept between sessions, so use Files in the lab's top bar to download single files or your whole home folder (home.tar.gz) before time runs out.",
  },
  {
    q: "Can I run more than one lab at a time?",
    a: "No, one active lab per student. End your current lab (or let it time out) and you can launch another straight away.",
  },
  {
    q: "Which email can I use?",
    a: "Only your Amrita student email address. You'll verify it with a link we email you. Check Junk if it doesn't arrive.",
  },
  {
    q: "What if I close the tab?",
    a: "Your lab keeps running until its hour is up. Go back to the dashboard and press Open Lab: you'll land in the same terminal session, with running programs still running.",
  },
  {
    q: "How long does a lab take to start?",
    a: "Usually 20 to 60 seconds. The dashboard shows each step while your container starts.",
  },
]

export function Faq() {
  return (
    <section id="faq" className="border-t">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions, answered"
          description="Short version: it's a fresh lab for an hour, then it's gone. Save what you need."
        />
        <Reveal>
          <Accordion type="single" collapsible className="rounded-xl border bg-card px-5 sm:px-6">
            {FAQS.map((item, i) => (
              <AccordionItem key={item.q} value={`q${i}`}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  )
}
