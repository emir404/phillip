import type { AnalyticsEvent } from "@nutz/phillip";
import { clockTime } from "./analytics";
import type { DashboardLead } from "./types";

// Time-series shaping for the overview. Everything auto-ranges from the data's
// actual span (the demo book covers ~90 minutes; production covers weeks), so
// nothing here assumes a fixed window.

// A signal is "notable" when it's a conversation/funnel moment rather than an
// ambient page signal. Shared by the event timeline and the activity feed.
export const NOTABLE_EVENTS = new Set([
  "ping_shown",
  "conversation_opened",
  "intent_classified",
  "iteration_requested",
  "iteration_ready",
  "escalated",
  "checkout_started",
  "paid",
  "funnel",
]);

// A short, human description of an event's payload, when it carries one.
export function eventDetail(e: AnalyticsEvent): string | null {
  const p = e.payload as Record<string, unknown>;
  switch (e.type) {
    case "section_view":
      return typeof p.section === "string" ? p.section : null;
    case "cta_hover":
      return typeof p.target === "string" ? `“${p.target}”` : null;
    case "ping_shown":
      return typeof p.reason === "string" ? `${p.reason} · score ${p.score}` : null;
    case "conversation_opened":
      return typeof p.trigger === "string" ? String(p.trigger) : null;
    case "intent_classified":
      return [p.intent, p.sentiment].filter(Boolean).join(" · ") || null;
    case "iteration_requested":
      return typeof p.round === "number" ? `round ${p.round}` : null;
    case "funnel":
      return p.from ? `${p.from} → ${p.to}` : String(p.to ?? "");
    case "escalated":
      return typeof p.email === "string" ? String(p.email) : null;
    default:
      return null;
  }
}

const MINUTE = 60_000;
// Bucket steps the range snaps to: 5m, 15m, 1h, 6h, 1d.
const STEPS = [5 * MINUTE, 15 * MINUTE, 60 * MINUTE, 360 * MINUTE, 1440 * MINUTE];
const TARGET_BUCKETS = 24;

function pickStep(spanMs: number): number {
  return STEPS.find((s) => spanMs / s <= TARGET_BUCKETS) ?? STEPS[STEPS.length - 1];
}

function bucketLabel(ts: number, step: number): string {
  return step >= 1440 * MINUTE
    ? new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : clockTime(new Date(ts).toISOString());
}

export interface ActivityBucket {
  ts: number;
  label: string;
  events: number;
  messages: number;
}

/**
 * Every analytics event and conversation message across the book, bucketed
 * into ~24 slots between the earliest and latest timestamp seen.
 */
export function bucketedActivity(leads: DashboardLead[]): ActivityBucket[] {
  const eventTimes: number[] = [];
  const messageTimes: number[] = [];
  for (const l of leads) {
    for (const e of l.events) {
      const t = new Date(e.ts).getTime();
      if (Number.isFinite(t)) eventTimes.push(t);
    }
    for (const msg of l.conversation?.messages ?? []) {
      const t = new Date(msg.ts).getTime();
      if (Number.isFinite(t)) messageTimes.push(t);
    }
  }
  const all = [...eventTimes, ...messageTimes];
  if (all.length === 0) return [];

  const min = Math.min(...all);
  const max = Math.max(...all);
  const step = pickStep(Math.max(max - min, 1));
  const start = Math.floor(min / step) * step;
  const count = Math.floor((max - start) / step) + 1;

  const buckets: ActivityBucket[] = Array.from({ length: count }, (_, i) => {
    const ts = start + i * step;
    return { ts, label: bucketLabel(ts, step), events: 0, messages: 0 };
  });
  const indexOf = (t: number) => Math.floor((t - start) / step);
  for (const t of eventTimes) buckets[indexOf(t)].events += 1;
  for (const t of messageTimes) buckets[indexOf(t)].messages += 1;
  return buckets;
}

/**
 * A small cumulative series (for KPI sparklines): how `values` accumulated
 * over time, sampled into `points` buckets across the data's span.
 */
function cumulativeSpark(stamps: Array<{ ts: number; value: number }>, points = 12): number[] {
  if (stamps.length === 0) return [];
  const times = stamps.map((s) => s.ts);
  const min = Math.min(...times);
  const max = Math.max(...times);
  const span = Math.max(max - min, 1);
  const series = new Array(points).fill(0);
  for (const s of stamps) {
    const idx = Math.min(points - 1, Math.floor(((s.ts - min) / span) * points));
    series[idx] += s.value;
  }
  let running = 0;
  return series.map((v) => {
    running += v;
    return running;
  });
}

/** Cumulative lead count over time, from each session's start. */
export function leadsSpark(leads: DashboardLead[]): number[] {
  return cumulativeSpark(
    leads
      .map((l) => new Date(l.session.startedAt).getTime())
      .filter(Number.isFinite)
      .map((ts) => ({ ts, value: 1 })),
  );
}

/** Cumulative collected revenue over time, stamped by each lead's paid event. */
export function revenueSpark(leads: DashboardLead[]): number[] {
  const stamps: Array<{ ts: number; value: number }> = [];
  for (const l of leads) {
    if (l.order?.status !== "paid") continue;
    const paidEvent = l.events.find((e) => e.type === "paid");
    const ts = new Date(paidEvent?.ts ?? l.session.lastSeen).getTime();
    if (Number.isFinite(ts)) stamps.push({ ts, value: l.order.amount });
  }
  return cumulativeSpark(stamps);
}

export interface FeedItem {
  id: string;
  leadId: string;
  business: string;
  label: string;
  detail: string | null;
  ts: string;
}

/** The most recent notable moments across every lead, newest first. */
export function notableFeed(leads: DashboardLead[], limit = 8): FeedItem[] {
  const items: FeedItem[] = [];
  for (const l of leads) {
    for (const e of l.events) {
      if (!NOTABLE_EVENTS.has(e.type)) continue;
      items.push({
        id: e.id,
        leadId: l.lead.id,
        business: l.lead.business,
        label: e.type,
        detail: eventDetail(e),
        ts: e.ts,
      });
    }
  }
  return items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, limit);
}
