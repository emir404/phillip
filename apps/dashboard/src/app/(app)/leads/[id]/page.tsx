import { CopyButton } from "@/components/copy-button";
import { EventTimeline } from "@/components/event-timeline";
import { Heatmap } from "@/components/heatmap";
import { IterationStatusBadge, statusReasonLabel } from "@/components/iteration-status-badge";
import { ConnectDomainForm } from "@/components/lead/connect-domain-form";
import { MakeLiveSwitch } from "@/components/lead/make-live-switch";
import {
  MarkEscalationHandledButton,
  MarkIterationDoneButton,
} from "@/components/lead/row-actions";
import { ScoreRing } from "@/components/score-ring";
import { Signals } from "@/components/signals";
import { StageBadge } from "@/components/stage-badge";
import { Transcript } from "@/components/transcript";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { money, relativeTime } from "@/lib/analytics";
import { budgetCapUsd } from "@/lib/anthropic";
import { agentFeed, attention, sessionMetrics } from "@/lib/metrics";
import { embedSnippet } from "@/lib/previews";
import {
  DEFAULT_PRICING,
  type PricingSettings,
  getLead,
  getLeadRow,
  getSetting,
  listEscalations,
  listIterations,
  spendForLead,
  usageForLead,
} from "@/lib/store";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{children}</p>
);

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dl = await getLead(id);
  if (!dl) notFound();

  const [leadRow, escalations, usage, spend, allIterations, pricing, h] = await Promise.all([
    getLeadRow(id),
    listEscalations(id),
    usageForLead(id),
    spendForLead(id),
    listIterations(),
    getSetting<PricingSettings>("pricing", DEFAULT_PRICING),
    headers(),
  ]);
  const cap = await budgetCapUsd(leadRow?.budgetCapUsd ?? null);
  const iterations = allIterations.filter((r) => r.iteration.leadId === id);

  const host = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost"}`;
  const snippet = embedSnippet(host, dl.preview.id);

  const metrics = sessionMetrics(dl);
  const atn = attention(dl);
  const feed = agentFeed(dl);
  const brief = feed.brief;

  const contactLine = [dl.lead.industry, dl.lead.source, dl.lead.contact, dl.lead.email]
    .filter(Boolean)
    .join(" · ");

  const orderPaid = dl.order?.status === "paid";
  const isLive = dl.preview.status === "live";

  // Per-model spend rows for the budget card.
  const byModel = new Map<string, { calls: number; tokens: number; costUsd: number }>();
  for (const u of usage) {
    const row = byModel.get(u.model) ?? { calls: 0, tokens: 0, costUsd: 0 };
    row.calls += 1;
    row.tokens += u.inputTokens + u.outputTokens;
    row.costUsd += u.costUsd;
    byModel.set(u.model, row);
  }
  const spendPct = cap > 0 ? Math.min(100, (spend / cap) * 100) : 0;

  const openEscalations = escalations.filter((e) => e.status === "open");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={13} />
          Overview
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <ScoreRing score={dl.engagementScore} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight">{dl.lead.business}</h1>
              <StageBadge stage={dl.lead.stage} />
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">{contactLine || "—"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dl.preview.url ? (
            <a
              href={dl.preview.url}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <ArrowSquareOut data-icon="inline-start" />
              Preview v{dl.preview.version}
            </a>
          ) : null}
          <CopyButton text={snippet} label="Copy snippet" toastMessage="Embed snippet copied" />
        </div>
      </header>

      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Signals */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Signals</CardTitle>
            <CardDescription>What the session told us</CardDescription>
          </CardHeader>
          <CardContent>
            <Signals metrics={metrics} />
          </CardContent>
        </Card>

        {/* Attention heatmap */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Attention heatmap</CardTitle>
            <CardDescription>Dwell per section, hottest first</CardDescription>
          </CardHeader>
          <CardContent>
            <Heatmap attention={atn} />
          </CardContent>
        </Card>

        {/* Agent brief */}
        <Card className="shadow-none md:col-span-2 xl:col-span-1">
          <CardHeader>
            <CardTitle>Agent brief</CardTitle>
            <CardDescription>Ready-to-apply guidance for the build agent</CardDescription>
            <CardAction>
              <CopyButton
                text={JSON.stringify(feed, null, 2)}
                label="Copy brief"
                toastMessage="Agent feed copied as JSON"
                size="xs"
              />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {brief.recommendedActions.length > 0 ? (
              <div>
                <SectionLabel>Recommended actions</SectionLabel>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {brief.recommendedActions.map((a) => (
                    <li key={a} className="flex items-start gap-2 text-sm">
                      <span
                        aria-hidden
                        className="mt-1 size-3 shrink-0 rounded-[4px] border border-muted-foreground/40"
                      />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {brief.requestedChanges.length > 0 ? (
              <div>
                <SectionLabel>Requested changes</SectionLabel>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                  {brief.requestedChanges.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {brief.objections.length > 0 ? (
              <div>
                <SectionLabel>Objections</SectionLabel>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                  {brief.objections.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {brief.questions.length > 0 ? (
              <div>
                <SectionLabel>Questions</SectionLabel>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                  {brief.questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-1.5">
              {brief.winningSections.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
                >
                  ★ {s}
                </span>
              ))}
              {brief.ignoredSections.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground line-through decoration-muted-foreground/50"
                >
                  {s}
                </span>
              ))}
              {brief.intent ? (
                <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                  intent: {brief.intent}
                </span>
              ) : null}
              {brief.sentiment ? (
                <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                  sentiment: {brief.sentiment}
                </span>
              ) : null}
            </div>
            <a
              href={`/v1/leads/${dl.lead.id}/export`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Raw JSON
            </a>
          </CardContent>
        </Card>

        {/* Conversation */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
            <CardDescription>
              {dl.conversation
                ? `${dl.conversation.messages.length} messages with Phillip`
                : "Phillip is still watching"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Transcript conversation={dl.conversation} />
          </CardContent>
        </Card>

        {/* Activity */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>The raw event stream, newest first</CardDescription>
          </CardHeader>
          <CardContent>
            <EventTimeline events={dl.events} />
          </CardContent>
        </Card>

        {/* Iterations */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Iterations</CardTitle>
            <CardDescription>
              {iterations.length ? `${iterations.length} rounds requested` : "No rounds yet"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col">
            {iterations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Edit requests from the chat will land here.
              </p>
            ) : (
              iterations.map(({ iteration: it }, i) => {
                const reason = statusReasonLabel(it.statusReason);
                return (
                  <div key={it.id}>
                    {i > 0 ? <Separator className="my-3" /> : null}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">Round {it.round}</span>
                          <IterationStatusBadge status={it.status} />
                        </div>
                        {reason ? (
                          <p className="mt-1 text-xs text-muted-foreground">{reason}</p>
                        ) : null}
                        {it.resultUrl ? (
                          <a
                            href={it.resultUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs text-foreground underline underline-offset-2"
                          >
                            <ArrowSquareOut size={12} />
                            Result
                          </a>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span
                          className="text-xs text-muted-foreground tabular-nums"
                          suppressHydrationWarning
                        >
                          {relativeTime(it.createdAt)}
                        </span>
                        {it.status === "queued_manual" ? (
                          <MarkIterationDoneButton iterationId={it.id} />
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Budget */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Budget</CardTitle>
            <CardDescription>LLM spend against this lead's cap</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold tabular-nums">${spend.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  of ${cap.toFixed(2)}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    spendPct >= 90
                      ? "bg-rose-500 dark:bg-rose-400"
                      : spendPct >= 60
                        ? "bg-amber-500 dark:bg-amber-400"
                        : "bg-emerald-500 dark:bg-emerald-400",
                  )}
                  style={{ width: `${spendPct}%` }}
                />
              </div>
            </div>
            {byModel.size > 0 ? (
              <div className="flex flex-col gap-1.5 border-t pt-3">
                {[...byModel.entries()].map(([model, r]) => (
                  <div key={model} className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate font-mono">{model}</span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {r.calls} calls · {r.tokens.toLocaleString()} tok · ${r.costUsd.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No LLM usage recorded yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Order & go-live */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Order &amp; go-live</CardTitle>
            <CardDescription>Money in, then the site ships</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <SectionLabel>Order</SectionLabel>
              {dl.order ? (
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex h-5 items-center rounded-full border border-transparent px-2 text-xs font-medium",
                      orderPaid
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300"
                        : dl.order.status === "pending"
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-destructive/10 text-destructive",
                    )}
                  >
                    {dl.order.status}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {money(dl.order.amount, dl.order.currency)}
                  </span>
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  none yet · {money(pricing.setupAmountCents, pricing.currency)} +{" "}
                  {money(pricing.monthlyAmountCents, pricing.currency)}/mo
                </span>
              )}
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Make live</p>
                <p className="text-xs text-muted-foreground">
                  {isLive
                    ? "The site is live."
                    : orderPaid
                      ? "Flip the preview to the production site."
                      : "Unlocks once the order is paid."}
                </p>
              </div>
              <MakeLiveSwitch leadId={dl.lead.id} isLive={isLive} orderPaid={orderPaid} />
            </div>
            <Separator />
            <div>
              <p className="mb-2 text-sm font-medium">Connect domain</p>
              <ConnectDomainForm leadId={dl.lead.id} />
            </div>
          </CardContent>
        </Card>

        {/* Escalations */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Escalations</CardTitle>
            <CardDescription>
              {openEscalations.length
                ? `${openEscalations.length} waiting on a human`
                : "Nothing waiting on you"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col">
            {escalations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No escalations from this lead.</p>
            ) : (
              escalations.map((esc, i) => (
                <div key={esc.id}>
                  {i > 0 ? <Separator className="my-3" /> : null}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">{esc.email}</span>
                        <span
                          className={cn(
                            "inline-flex h-5 items-center rounded-full border border-transparent px-2 text-xs font-medium",
                            esc.status === "open"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {esc.status}
                        </span>
                      </div>
                      {esc.reason ? (
                        <p className="mt-1 text-xs text-muted-foreground">{esc.reason}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span
                        className="text-xs text-muted-foreground tabular-nums"
                        suppressHydrationWarning
                      >
                        {relativeTime(esc.createdAt)}
                      </span>
                      {esc.status === "open" ? (
                        <MarkEscalationHandledButton escalationId={esc.id} leadId={dl.lead.id} />
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
