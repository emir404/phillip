import type { LeadStage } from "@nutz/phillip";
import type { DashboardLead } from "../data/sample";

// The funnel order mirrors the embed's funnel/stages.ts. iterating + escalated
// share a tier (two branches off "reacted"). Defined here so the dashboard has
// no runtime dependency on the embed bundle — only its types.
export const FUNNEL_ORDER: Record<LeadStage, number> = {
  delivered: 0,
  opened: 1,
  engaged: 2,
  reacted: 3,
  iterating: 4,
  escalated: 4,
  checkout: 5,
  paid: 6,
  live: 7,
};

export const STAGE_LABEL: Record<LeadStage, string> = {
  delivered: "Delivered",
  opened: "Opened",
  engaged: "Engaged",
  reacted: "Reacted",
  iterating: "Iterating",
  escalated: "Escalated",
  checkout: "Checkout",
  paid: "Paid",
  live: "Live",
};

// The main funnel rungs (the two branches collapse into "reacted" for the
// top-line funnel; branches are surfaced separately).
export const FUNNEL_STAGES: LeadStage[] = [
  "opened",
  "engaged",
  "reacted",
  "checkout",
  "paid",
  "live",
];

/** A lead counts toward a stage if it reached it (its stage is at or past it). */
export function reached(stage: LeadStage, target: LeadStage): boolean {
  return FUNNEL_ORDER[stage] >= FUNNEL_ORDER[target];
}

export interface FunnelRung {
  stage: LeadStage;
  label: string;
  count: number;
  pctOfTop: number;
  pctOfPrev: number;
}

export function funnel(leads: DashboardLead[]): FunnelRung[] {
  const top = leads.length || 1;
  let prev = leads.length;
  return FUNNEL_STAGES.map((stage) => {
    const count = leads.filter((l) => reached(l.lead.stage, stage)).length;
    const rung: FunnelRung = {
      stage,
      label: STAGE_LABEL[stage],
      count,
      pctOfTop: Math.round((count / top) * 100),
      pctOfPrev: prev === 0 ? 0 : Math.round((count / prev) * 100),
    };
    prev = count;
    return rung;
  });
}

export interface Kpis {
  leads: number;
  engaged: number;
  engagedPct: number;
  paid: number;
  paidPct: number;
  revenue: number;
  avgScore: number;
}

export function kpis(leads: DashboardLead[]): Kpis {
  const total = leads.length;
  const engaged = leads.filter((l) => reached(l.lead.stage, "engaged")).length;
  const paidLeads = leads.filter((l) => reached(l.lead.stage, "paid"));
  const revenue = leads
    .map((l) => l.order)
    .filter((o): o is NonNullable<typeof o> => !!o && o.status === "paid")
    .reduce((sum, o) => sum + o.amount, 0);
  const avgScore = total ? Math.round(leads.reduce((s, l) => s + l.engagementScore, 0) / total) : 0;
  return {
    leads: total,
    engaged,
    engagedPct: total ? Math.round((engaged / total) * 100) : 0,
    paid: paidLeads.length,
    paidPct: total ? Math.round((paidLeads.length / total) * 100) : 0,
    revenue,
    avgScore,
  };
}

// --- formatting -------------------------------------------------------------

export function money(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// Human labels for the event stream.
export function eventLabel(type: string): string {
  const map: Record<string, string> = {
    pageview: "Landed on the preview",
    scroll_depth: "Scrolled",
    section_view: "Viewed a section",
    time_tick: "Active on page",
    active: "Active",
    idle: "Went idle",
    click: "Clicked",
    cta_hover: "Hovered a CTA",
    gallery_open: "Opened the gallery",
    video_play: "Played a video",
    contact_interaction: "Interacted with contact",
    ping_shown: "Phillip pinged",
    conversation_opened: "Opened the chat",
    message_sent: "Sent a message",
    message_received: "Phillip replied",
    intent_classified: "Intent classified",
    iteration_requested: "Requested an edit",
    iteration_ready: "Edit shipped",
    funnel: "Moved stage",
    escalated: "Escalated to email",
    checkout_started: "Started checkout",
    paid: "Paid",
  };
  return map[type] ?? type;
}
