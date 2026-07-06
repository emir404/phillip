import type {
  AnalyticsEvent,
  DeviceContext,
  GeoContext,
  Intent,
  LeadStage,
  Sentiment,
} from "@nutz/phillip";
import type { DashboardLead } from "./types";

// Derives everything a human (or an agent) needs to understand a session from
// the raw record + event stream: how long they stayed and how engaged they
// were (analytics), which parts of the page held their attention (heatmap),
// and a synthesized brief a build agent can act on (the agent feed). Pure TS —
// shared by the API routes and the client UI, no React or Node dependency.

interface SnapshotPayload {
  activeTimeSec: number;
  scrollDepthPct: number;
  sectionsViewed: number;
  sections: Record<string, number>;
  clicks: number;
  ctaHovers: number;
  galleryOpens: number;
  videoPlays: number;
  contactInteractions: number;
  score: number;
}

function latestSnapshot(events: AnalyticsEvent[]): SnapshotPayload | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].type === "signals_snapshot")
      return events[i].payload as unknown as SnapshotPayload;
  }
  return undefined;
}

function countType(events: AnalyticsEvent[], type: string): number {
  return events.reduce((n, e) => n + (e.type === type ? 1 : 0), 0);
}

function maxScroll(events: AnalyticsEvent[]): number {
  let max = 0;
  for (const e of events) {
    if (e.type === "scroll_depth") {
      const pct = (e.payload as { pct?: number }).pct ?? 0;
      if (pct > max) max = pct;
    }
  }
  return max;
}

// --- session metrics (the "how much time / which browser" answer) -----------

export interface SessionMetrics {
  timeOnPageSec: number;
  activeTimeSec: number;
  scrollDepthPct: number;
  sectionsViewed: number;
  clicks: number;
  ctaHovers: number;
  galleryOpens: number;
  videoPlays: number;
  contactInteractions: number;
  messagesSent: number;
  messagesReceived: number;
  iterationRounds: number;
  device: DeviceContext;
  geo?: GeoContext;
  referrer: string;
  returning: boolean;
  source: string;
  startedAt: string;
  lastSeen: string;
}

export function sessionMetrics(dl: DashboardLead): SessionMetrics {
  const snap = latestSnapshot(dl.events);
  const startedMs = new Date(dl.session.startedAt).getTime();
  const lastMs = new Date(dl.session.lastSeen).getTime();
  const timeOnPageSec = Math.max(0, Math.round((lastMs - startedMs) / 1000));

  return {
    timeOnPageSec,
    activeTimeSec:
      snap?.activeTimeSec ?? Math.min(timeOnPageSec, countType(dl.events, "time_tick")),
    scrollDepthPct: snap?.scrollDepthPct ?? maxScroll(dl.events),
    sectionsViewed:
      snap?.sectionsViewed ??
      new Set(
        dl.events
          .filter((e) => e.type === "section_view")
          .map((e) => (e.payload as { section?: string }).section),
      ).size,
    clicks: snap?.clicks ?? countType(dl.events, "click"),
    ctaHovers: snap?.ctaHovers ?? countType(dl.events, "cta_hover"),
    galleryOpens: snap?.galleryOpens ?? countType(dl.events, "gallery_open"),
    videoPlays: snap?.videoPlays ?? countType(dl.events, "video_play"),
    contactInteractions: snap?.contactInteractions ?? countType(dl.events, "contact_interaction"),
    messagesSent: dl.conversation?.messages.filter((m) => m.role === "lead").length ?? 0,
    messagesReceived: dl.conversation?.messages.filter((m) => m.role === "phillip").length ?? 0,
    iterationRounds: countType(dl.events, "iteration_requested"),
    device: dl.session.device,
    geo: dl.session.geo,
    referrer: dl.session.referrer ?? "direct",
    returning: dl.session.returning,
    source: dl.lead.source,
    startedAt: dl.session.startedAt,
    lastSeen: dl.session.lastSeen,
  };
}

// --- section attention (the heatmap: which parts he looked at most) ---------

export interface SectionAttention {
  section: string;
  seconds: number;
  /** 0–100 heat intensity, relative to the most-viewed section. */
  intensity: number;
}

export function attention(dl: DashboardLead): SectionAttention[] {
  const snap = latestSnapshot(dl.events);
  const byName = new Map<string, number>();

  if (snap && Object.keys(snap.sections).length > 0) {
    for (const [name, sec] of Object.entries(snap.sections)) byName.set(name, sec);
  } else {
    // Fall back to summing section_view dwell (visibleMs) from the raw stream.
    for (const e of dl.events) {
      if (e.type !== "section_view") continue;
      const p = e.payload as { section?: string; visibleMs?: number };
      if (!p.section) continue;
      byName.set(p.section, (byName.get(p.section) ?? 0) + (p.visibleMs ?? 0) / 1000);
    }
  }

  const rows = [...byName.entries()]
    .map(([section, seconds]) => ({ section, seconds: Math.round(seconds * 10) / 10 }))
    .sort((a, b) => b.seconds - a.seconds);
  const top = rows[0]?.seconds ?? 0;
  return rows.map((r) => ({
    ...r,
    intensity: top > 0 ? Math.round((r.seconds / top) * 100) : 0,
  }));
}

// --- agent feed (the raw data agents consume to mass-produce sites) ---------

export interface FunnelTransition {
  from: LeadStage | null;
  to: LeadStage;
  reason?: string;
  ts: string;
}

export interface AgentBrief {
  business: string;
  industry?: string;
  contact?: string;
  email?: string;
  source: string;
  stage: LeadStage;
  engagementScore: number;
  intent?: Intent;
  sentiment?: Sentiment;
  /** Verbatim edits the lead asked for — the top priority for a build agent. */
  requestedChanges: string[];
  objections: string[];
  questions: string[];
  /** Sections that held the most attention — keep and lead with these. */
  winningSections: string[];
  /** Sections that were barely seen — candidates to cut, shorten, or move up. */
  ignoredSections: string[];
  /** Heuristic, ready-to-apply guidance synthesized from the whole session. */
  recommendedActions: string[];
}

export interface AgentFeedItem {
  leadId: string;
  business: string;
  industry?: string;
  stage: LeadStage;
  engagementScore: number;
  preview: { url: string; version: number; status: string };
  metrics: SessionMetrics;
  attention: SectionAttention[];
  funnel: { stage: LeadStage; history: FunnelTransition[] };
  conversation?: {
    intent?: Intent;
    sentiment?: Sentiment;
    messageCount: number;
    transcript: Array<{
      role: string;
      text: string;
      ts: string;
      intent?: Intent;
      sentiment?: Sentiment;
    }>;
  };
  order?: DashboardLead["order"];
  brief: AgentBrief;
}

function funnelHistory(events: AnalyticsEvent[]): FunnelTransition[] {
  return events
    .filter((e) => e.type === "funnel")
    .map((e) => {
      const p = e.payload as { from?: LeadStage | null; to: LeadStage; reason?: string };
      return { from: p.from ?? null, to: p.to, reason: p.reason, ts: e.ts };
    });
}

function buildBrief(dl: DashboardLead, atn: SectionAttention[]): AgentBrief {
  const leadMsgs = dl.conversation?.messages.filter((m) => m.role === "lead") ?? [];
  const requestedChanges = leadMsgs
    .filter((m) => m.intent === "iterate")
    .map((m) => m.text.trim())
    .filter(Boolean);
  const objections = leadMsgs
    .filter((m) => m.intent === "objection")
    .map((m) => m.text.trim())
    .filter(Boolean);
  const questions = leadMsgs
    .filter((m) => m.text.includes("?"))
    .map((m) => m.text.trim())
    .filter(Boolean);

  const winningSections = atn.slice(0, 2).map((a) => a.section);
  const ignoredSections = atn.filter((a) => a.intensity < 25).map((a) => a.section);

  const m = sessionMetrics(dl);
  const recommendedActions: string[] = [];
  if (requestedChanges.length) {
    recommendedActions.push(`Apply requested edits: ${requestedChanges.join("; ")}`);
  }
  if (m.scrollDepthPct < 50) {
    recommendedActions.push(
      "Lead stayed near the fold — sharpen the hero headline and value prop up top.",
    );
  }
  if (winningSections.length) {
    recommendedActions.push(
      `Keep and lead with the strongest sections: ${winningSections.join(", ")}.`,
    );
  }
  if (ignoredSections.length) {
    recommendedActions.push(
      `Trim, shorten, or move up under-viewed sections: ${ignoredSections.join(", ")}.`,
    );
  }
  if (m.contactInteractions > 0) {
    recommendedActions.push(
      "Lead tried to reach out — surface phone/booking/contact above the fold.",
    );
  }
  if (atn[0]?.section === "pricing" && dl.lead.stage !== "paid" && dl.lead.stage !== "live") {
    recommendedActions.push(
      "Strong pricing interest without a purchase — clarify pricing and add reassurance (guarantee, reviews).",
    );
  }
  if (objections.length) {
    recommendedActions.push(`Address objections directly: ${objections.join("; ")}.`);
  }

  return {
    business: dl.lead.business,
    industry: dl.lead.industry,
    contact: dl.lead.contact,
    email: dl.lead.email,
    source: dl.lead.source,
    stage: dl.lead.stage,
    engagementScore: dl.engagementScore,
    intent: dl.conversation?.intent,
    sentiment: dl.conversation?.sentiment,
    requestedChanges,
    objections,
    questions,
    winningSections,
    ignoredSections,
    recommendedActions,
  };
}

export function agentFeed(dl: DashboardLead): AgentFeedItem {
  const atn = attention(dl);
  const conversation = dl.conversation
    ? {
        intent: dl.conversation.intent,
        sentiment: dl.conversation.sentiment,
        messageCount: dl.conversation.messages.length,
        transcript: dl.conversation.messages.map((mm) => ({
          role: mm.role,
          text: mm.text,
          ts: mm.ts,
          intent: mm.intent,
          sentiment: mm.sentiment,
        })),
      }
    : undefined;

  return {
    leadId: dl.lead.id,
    business: dl.lead.business,
    industry: dl.lead.industry,
    stage: dl.lead.stage,
    engagementScore: dl.engagementScore,
    preview: { url: dl.preview.url, version: dl.preview.version, status: dl.preview.status },
    metrics: sessionMetrics(dl),
    attention: atn,
    funnel: { stage: dl.lead.stage, history: funnelHistory(dl.events) },
    conversation,
    order: dl.order,
    brief: buildBrief(dl, atn),
  };
}

// --- aggregate insights across the whole book (mass-production signals) ------

export interface AggregateInsights {
  generatedAt: string;
  leads: number;
  paid: number;
  revenue: number;
  conversionPct: number;
  avgActiveTimeSec: number;
  avgScrollDepthPct: number;
  topSections: Array<{ section: string; seconds: number }>;
  topRequestedChanges: Array<{ label: string; count: number }>;
  topObjections: Array<{ label: string; count: number }>;
  industries: Array<{ industry: string; leads: number; paid: number }>;
}

function tally(items: string[]): Array<{ label: string; count: number }> {
  const map = new Map<string, number>();
  for (const raw of items) {
    const label = raw.trim().toLowerCase();
    if (!label) continue;
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function aggregateInsights(leads: DashboardLead[]): AggregateInsights {
  const feeds = leads.map(agentFeed);
  const paidFeeds = feeds.filter((f) => f.order?.status === "paid");
  const revenue = paidFeeds.reduce((s, f) => s + (f.order?.amount ?? 0), 0);

  const sectionSeconds = new Map<string, number>();
  for (const f of feeds) {
    for (const a of f.attention) {
      sectionSeconds.set(a.section, (sectionSeconds.get(a.section) ?? 0) + a.seconds);
    }
  }

  const industryMap = new Map<string, { leads: number; paid: number }>();
  for (const f of feeds) {
    const key = f.industry ?? "unknown";
    const row = industryMap.get(key) ?? { leads: 0, paid: 0 };
    row.leads += 1;
    if (f.order?.status === "paid") row.paid += 1;
    industryMap.set(key, row);
  }

  const activeTimes = feeds.map((f) => f.metrics.activeTimeSec);
  const scrolls = feeds.map((f) => f.metrics.scrollDepthPct);
  const avg = (xs: number[]) =>
    xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;

  return {
    generatedAt: new Date().toISOString(),
    leads: feeds.length,
    paid: paidFeeds.length,
    revenue,
    conversionPct: feeds.length ? Math.round((paidFeeds.length / feeds.length) * 100) : 0,
    avgActiveTimeSec: avg(activeTimes),
    avgScrollDepthPct: avg(scrolls),
    topSections: [...sectionSeconds.entries()]
      .map(([section, seconds]) => ({ section, seconds: Math.round(seconds * 10) / 10 }))
      .sort((a, b) => b.seconds - a.seconds),
    topRequestedChanges: tally(feeds.flatMap((f) => f.brief.requestedChanges)),
    topObjections: tally(feeds.flatMap((f) => f.brief.objections)),
    industries: [...industryMap.entries()]
      .map(([industry, v]) => ({ industry, ...v }))
      .sort((a, b) => b.leads - a.leads),
  };
}

// --- formatting helper shared by the UI -------------------------------------

export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return rem ? `${m}m ${rem}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
