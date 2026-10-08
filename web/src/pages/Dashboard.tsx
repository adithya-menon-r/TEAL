import { useCallback, useRef, useState, type ReactNode, type Ref } from "react"
import { AnimatePresence, motion } from "motion/react"
import { InfoIcon, RotateCwIcon, WifiOffIcon, XIcon } from "lucide-react"

import { ActiveLabCard } from "@/components/dashboard/active-lab-card"
import { CatalogGrid, CatalogSkeleton } from "@/components/dashboard/catalog-grid"
import { FailureCard } from "@/components/dashboard/failure-card"
import { RecentLabs, RecentLabsSkeleton } from "@/components/dashboard/recent-labs"
import { FadeIn } from "@/components/motion"
import { Notice } from "@/components/notice"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useApiResource } from "@/hooks/use-api-resource"
import { isActiveSession, useLabSession } from "@/hooks/use-lab-session"
import { apiErrorMessage, getHistory, getTemplates, isApiError } from "@/lib/api"
import { formatUsd } from "@/lib/format"
import { transitions } from "@/lib/motion"
import type { Template } from "@/lib/types"

const BLOCKED_REASON = "You already have a lab running. End it to launch another."

/** Quiet placeholder for a section that failed while the whole API is unreachable. */
function OfflinePlaceholder({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
      <WifiOffIcon className="size-4 shrink-0" aria-hidden />
      {children}
    </div>
  )
}

/** Collapsing wrapper for blocks that come and go (active card, notices). */
function Presence({ show, id, children }: { show: boolean; id: string; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key={id}
          initial={{ opacity: 0, height: 0, y: -6 }}
          animate={{ opacity: 1, height: "auto", y: 0, transition: transitions.slow }}
          exit={{ opacity: 0, height: 0, scale: 0.98, transition: transitions.base }}
          className="-m-1.5 overflow-hidden p-1.5"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SectionHeader({
  id,
  title,
  description,
  aside,
  headingRef,
}: {
  id: string
  title: string
  description: ReactNode
  aside?: ReactNode
  headingRef?: Ref<HTMLHeadingElement>
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h2
          id={id}
          ref={headingRef}
          tabIndex={headingRef ? -1 : undefined}
          className="w-fit rounded-sm text-lg font-bold tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
        >
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {aside}
    </div>
  )
}

export default function DashboardPage() {

  const lab = useLabSession()
  const templates = useApiResource(getTemplates)
  const history = useApiResource(getHistory, lab.historyKey)

  const [focusActive, setFocusActive] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const catalogHeadingRef = useRef<HTMLHeadingElement>(null)

  const active = isActiveSession(lab.session) ? lab.session : null
  const activeTemplate = active ? templates.data?.find((t) => t.id === active.templateId) : undefined

  async function handleLaunch(template: Pick<Template, "id" | "name">) {
    const outcome = await lab.launch(template)
    if (outcome !== "failed") setFocusActive(true)
  }

  const clearFocusRequest = useCallback(() => setFocusActive(false), [])

  const focusCatalog = useCallback(() => {
    // After the dialog unmounts, move focus to the next landmark instead of <body>.
    window.setTimeout(() => catalogHeadingRef.current?.focus({ preventScroll: true }), 0)
  }, [])

  async function retryAll() {
    setRetrying(true)
    templates.reload()
    history.reload()
    await lab.refresh()
    setRetrying(false)
  }

  // When the API is unreachable the banner at the top (with Retry) speaks for every section.
  const offline = isApiError(lab.pollError, "network_error")
  const sectionOffline = (error: unknown) => offline && isApiError(error, "network_error")

  // Back online (a poll succeeded): reload the sections that failed meanwhile.
  const [wasOffline, setWasOffline] = useState(offline)
  if (offline !== wasOffline) {
    setWasOffline(offline)
    if (!offline) {
      if (templates.error) templates.reload()
      if (history.error) history.reload()
    }
  }

  const historyTotal = history.data?.reduce((sum, s) => sum + (s.costUsd ?? 0), 0) ?? 0

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-10">
        {/* Connection problems, current lab, failed launch */}
        <div className="flex flex-col gap-4 empty:hidden">
          <Presence show={!!lab.pollError} id="offline">
            <Notice
              tone="danger"
              title="Can't reach TEAL"
              action={
                <Button variant="outline" size="sm" onClick={retryAll} loading={retrying}>
                  <RotateCwIcon />
                  Retry
                </Button>
              }
            >
              {apiErrorMessage(lab.pollError)}
              {active && " The timer keeps running; your lab is unaffected."}
            </Notice>
          </Presence>

          <Presence show={!!active} id={active ? `active-${active.id}` : "active"}>
            {active && (
              <ActiveLabCard
                session={active}
                template={activeTemplate}
                justReady={lab.readyId === active.id}
                focusRequested={focusActive}
                onFocusHandled={clearFocusRequest}
                onEnd={lab.end}
                onEnded={focusCatalog}
              />
            )}
          </Presence>

          <Presence show={!!lab.failure && !active} id={`failure-${lab.failure?.sessionId ?? lab.failure?.templateId}`}>
            {lab.failure && (
              <FailureCard
                failure={lab.failure}
                retrying={lab.launchingId === lab.failure.templateId}
                disabled={lab.launchingId !== null}
                onRetry={() => void lab.retryFailure().then((o) => o !== "failed" && setFocusActive(true))}
                onDismiss={lab.dismissFailure}
              />
            )}
          </Presence>
        </div>

        <FadeIn delay={0.05}>
          <section aria-labelledby="catalog-title">
            <SectionHeader
              id="catalog-title"
              headingRef={catalogHeadingRef}
              title="Labs"
              description="Each lab is a fresh container that runs for 60 minutes. One lab at a time."
              aside={
                <AnimatePresence initial={false}>
                  {active && (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0, transition: transitions.base }}
                      exit={{ opacity: 0, transition: transitions.fast }}
                      className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <InfoIcon className="size-3.5" aria-hidden />
                      Launch is off while your lab is running
                    </motion.p>
                  )}
                </AnimatePresence>
              }
            />

            <Presence show={!!lab.notice} id="launch-notice">
              {lab.notice && (
                <Notice
                  tone={lab.notice.tone}
                  title={lab.notice.message}
                  className="mb-4"
                  action={
                    <Button variant="ghost" size="icon-sm" onClick={lab.dismissNotice} aria-label="Dismiss">
                      <XIcon />
                    </Button>
                  }
                />
              )}
            </Presence>

            {templates.data ? (
              <CatalogGrid
                templates={templates.data}
                activeTemplateId={active?.templateId}
                launchBlocked={!!active}
                blockedReason={active ? BLOCKED_REASON : undefined}
                launchingId={lab.launchingId}
                onLaunch={(t) => void handleLaunch(t)}
              />
            ) : sectionOffline(templates.error) ? (
              <OfflinePlaceholder>The lab catalog will load once TEAL is reachable.</OfflinePlaceholder>
            ) : templates.error ? (
              <Notice
                tone="danger"
                title="Couldn't load the labs"
                action={
                  <Button variant="outline" size="sm" onClick={templates.reload}>
                    <RotateCwIcon />
                    Retry
                  </Button>
                }
              >
                {apiErrorMessage(templates.error)}
              </Notice>
            ) : (
              <CatalogSkeleton />
            )}
          </section>
        </FadeIn>

        <FadeIn delay={0.1}>
          <section aria-labelledby="history-title">
            <SectionHeader
              id="history-title"
              title="Recent labs"
              description="Your last 10 labs."
              aside={
                history.data && history.data.length > 0 ? (
                  <p className="shrink-0 font-mono text-xs text-muted-foreground">
                    Total <span className="font-medium text-foreground">{formatUsd(historyTotal)}</span>
                  </p>
                ) : undefined
              }
            />
            {history.data ? (
              <RecentLabs sessions={history.data} />
            ) : sectionOffline(history.error) ? (
              <OfflinePlaceholder>Your recent labs will load once TEAL is reachable.</OfflinePlaceholder>
            ) : history.error ? (
              <Notice
                tone="danger"
                title="Couldn't load your recent labs"
                action={
                  <Button variant="outline" size="sm" onClick={history.reload}>
                    <RotateCwIcon />
                    Retry
                  </Button>
                }
              >
                {apiErrorMessage(history.error)}
              </Notice>
            ) : (
              <RecentLabsSkeleton />
            )}
          </section>
        </FadeIn>
      </div>
    </TooltipProvider>
  )
}
