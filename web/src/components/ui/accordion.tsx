import * as React from "react"
import { Accordion as AccordionPrimitive } from "radix-ui"
import { PlusIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Accordion({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("flex w-full flex-col", className)}
      {...props}
    />
  )
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b last:border-b-0", className)}
      {...props}
    />
  )
}

/** Trigger with a plus icon that rotates into an × when open. */
function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/accordion-trigger flex flex-1 items-center justify-between gap-4 rounded-sm py-4 text-left text-[0.9375rem] font-semibold outline-none",
          "transition-colors duration-150 hover:text-primary-ink",
          "focus-visible:ring-[3px] focus-visible:ring-ring/35",
          "disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
        <span className="grid size-6 shrink-0 place-items-center rounded-sm border bg-card text-muted-foreground transition-[transform,color,border-color] duration-200 ease-out group-hover/accordion-trigger:border-primary/40 group-hover/accordion-trigger:text-primary-ink group-data-[state=open]/accordion-trigger:rotate-45">
          <PlusIcon className="size-3.5" aria-hidden />
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="overflow-hidden text-sm data-open:animate-accordion-down data-closed:animate-accordion-up"
      {...props}
    >
      <div
        className={cn(
          "pb-4 pr-10 leading-relaxed text-muted-foreground [&_a]:text-primary-ink [&_a]:underline [&_a]:underline-offset-3",
          className
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
