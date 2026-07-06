import fs from "node:fs";
import path from "node:path";
import type { AnalyticsEvent, Lead, LeadStage, Message, Preview, Session } from "@nutz/phillip";
import { FUNNEL_ORDER } from "./analytics";
import { sampleLeads } from "./seed-data";
import type { DashboardLead } from "./types";

// A deliberately small, swappable persistence layer. It keeps the whole dataset
// in memory (fast reads for the dashboard) and write-through-persists it to a
// JSON file so a plain `next start` / container deploy survives restarts. If the
// filesystem isn't writable (e.g. a read-only serverless runtime) it degrades
// to memory-only — the API still works, it just won't persist across cold
// starts. Swapping this module for Postgres/Prisma is the one seam to change.

interface StoreState {
  byLead: Map<string, DashboardLead>;
  sessionIndex: Map<string, string>; // sessionId -> leadId
  file: string | null; // null => memory-only
}

const GLOBAL_KEY = "__phillip_store__";

function dataFile(): string {
  return process.env.PHILLIP_DATA_FILE ?? path.join(process.cwd(), ".data", "phillip.json");
}

function tryWritable(file: string): boolean {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.accessSync(path.dirname(file), fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function indexSessions(byLead: Map<string, DashboardLead>): Map<string, string> {
  const idx = new Map<string, string>();
  for (const dl of byLead.values()) idx.set(dl.session.id, dl.lead.id);
  return idx;
}

function load(): StoreState {
  const file = dataFile();
  // Prefer an existing file; else fall back through /tmp; else memory.
  const candidates = [file, path.join("/tmp", "phillip.json")];

  for (const f of candidates) {
    try {
      if (fs.existsSync(f)) {
        const raw = JSON.parse(fs.readFileSync(f, "utf8")) as DashboardLead[];
        const byLead = new Map(raw.map((dl) => [dl.lead.id, dl] as const));
        return { byLead, sessionIndex: indexSessions(byLead), file: tryWritable(f) ? f : null };
      }
    } catch {
      // corrupt/unreadable — ignore and keep looking.
    }
  }

  // Fresh start: seed so a new deploy shows real data immediately.
  const seeded = new Map(sampleLeads.map((dl) => [dl.lead.id, structuredClone(dl)] as const));
  const target = tryWritable(file)
    ? file
    : tryWritable(path.join("/tmp", "phillip.json"))
      ? path.join("/tmp", "phillip.json")
      : null;
  const state: StoreState = { byLead: seeded, sessionIndex: indexSessions(seeded), file: target };
  persist(state);
  return state;
}

function persist(state: StoreState): void {
  if (!state.file) return;
  try {
    fs.writeFileSync(state.file, JSON.stringify([...state.byLead.values()], null, 2));
  } catch {
    // If a write fails mid-flight, drop to memory-only rather than throwing.
    state.file = null;
  }
}

function store(): StoreState {
  const g = globalThis as unknown as Record<string, StoreState | undefined>;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = load();
  return g[GLOBAL_KEY] as StoreState;
}

// --- stage / score helpers --------------------------------------------------

function advanceStage(current: LeadStage, candidate: LeadStage): LeadStage {
  return FUNNEL_ORDER[candidate] > FUNNEL_ORDER[current] ? candidate : current;
}

// Map an inbound event to the furthest stage it implies.
function stageFromEvent(e: AnalyticsEvent): LeadStage | null {
  const p = e.payload as Record<string, unknown>;
  switch (e.type) {
    case "pageview":
      return "opened";
    case "conversation_opened":
      return "engaged";
    case "intent_classified":
      return "reacted";
    case "iteration_requested":
      return "iterating";
    case "escalated":
      return "escalated";
    case "checkout_started":
      return "checkout";
    case "paid":
      return "paid";
    case "funnel":
      return typeof p.to === "string" ? (p.to as LeadStage) : null;
    default:
      return null;
  }
}

// --- public API -------------------------------------------------------------

export function getLeads(): DashboardLead[] {
  return [...store().byLead.values()].sort(
    (a, b) => new Date(b.session.lastSeen).getTime() - new Date(a.session.lastSeen).getTime(),
  );
}

export function getLead(id: string): DashboardLead | undefined {
  return store().byLead.get(id);
}

export interface LeadUpsert {
  lead: {
    id: string;
    business: string;
    contact?: string;
    industry?: string;
    email?: string;
    source?: string;
    stage?: LeadStage;
  };
  preview?: Partial<Preview> & { id: string };
  session: {
    id: string;
    previewId?: string;
    device?: Session["device"];
    geo?: Session["geo"];
    referrer?: string;
    returning?: boolean;
    startedAt?: string;
  };
  engagementScore?: number;
}

const defaultDevice = (): Session["device"] => ({
  type: "desktop",
  os: "unknown",
  browser: "unknown",
  viewport: { width: 0, height: 0 },
});

export function upsertLead(input: LeadUpsert): DashboardLead {
  const s = store();
  const existing = s.byLead.get(input.lead.id);
  const nowIso = new Date().toISOString();

  const lead: Lead = {
    id: input.lead.id,
    business: input.lead.business,
    contact: input.lead.contact ?? existing?.lead.contact,
    industry: input.lead.industry ?? existing?.lead.industry,
    email: input.lead.email ?? existing?.lead.email,
    source: input.lead.source ?? existing?.lead.source ?? "unknown",
    stage: input.lead.stage ?? existing?.lead.stage ?? "delivered",
  };

  const previewId =
    input.preview?.id ?? input.session.previewId ?? existing?.preview.id ?? `prv_${lead.id}`;
  const preview: Preview = {
    id: previewId,
    leadId: lead.id,
    url: input.preview?.url ?? existing?.preview.url ?? "",
    version: input.preview?.version ?? existing?.preview.version ?? 1,
    status: input.preview?.status ?? existing?.preview.status ?? "draft",
  };

  const session: Session = {
    id: input.session.id,
    previewId,
    device: input.session.device ?? existing?.session.device ?? defaultDevice(),
    geo: input.session.geo ?? existing?.session.geo,
    referrer: input.session.referrer ?? existing?.session.referrer,
    startedAt: input.session.startedAt ?? existing?.session.startedAt ?? nowIso,
    lastSeen: nowIso,
    returning: input.session.returning ?? existing?.session.returning ?? false,
  };

  const dl: DashboardLead = {
    lead,
    preview,
    session,
    engagementScore: input.engagementScore ?? existing?.engagementScore ?? 5,
    events: existing?.events ?? [],
    conversation: existing?.conversation,
    order: existing?.order,
  };

  s.byLead.set(lead.id, dl);
  s.sessionIndex.set(session.id, lead.id);
  persist(s);
  return dl;
}

// Create a bare lead when analytics arrive before a lead was registered, so no
// signal is ever dropped.
function ensureBySession(sessionId: string): DashboardLead {
  const s = store();
  const leadId = s.sessionIndex.get(sessionId);
  const found = leadId ? s.byLead.get(leadId) : undefined;
  if (found) return found;
  return upsertLead({
    lead: { id: `lead_${sessionId}`, business: "Unknown lead", stage: "opened" },
    session: { id: sessionId },
  });
}

export function saveEvents(sessionId: string, events: AnalyticsEvent[]): DashboardLead {
  const s = store();
  const dl = ensureBySession(sessionId);
  const seen = new Set(dl.events.map((e) => e.id));

  let stage = dl.lead.stage;
  let score = dl.engagementScore;
  let lastTs = dl.session.lastSeen;

  for (const e of events) {
    if (!e.id || seen.has(e.id)) continue;
    seen.add(e.id);
    dl.events.push(e);
    const implied = stageFromEvent(e);
    if (implied) stage = advanceStage(stage, implied);
    const p = e.payload as Record<string, unknown>;
    if (typeof p.score === "number") score = Math.max(score, Math.round(p.score));
    if (e.ts && new Date(e.ts).getTime() > new Date(lastTs).getTime()) lastTs = e.ts;
  }

  dl.events.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  dl.lead.stage = stage;
  dl.engagementScore = Math.min(100, score);
  dl.session.lastSeen = lastTs;
  persist(s);
  return dl;
}

export function appendMessages(
  sessionId: string,
  messages: Message[],
  meta?: { intent?: string; sentiment?: string },
): DashboardLead {
  const s = store();
  const dl = ensureBySession(sessionId);
  if (!dl.conversation) {
    dl.conversation = { id: `conv_${sessionId}`, sessionId, channel: "web", messages: [] };
  }
  const seen = new Set(dl.conversation.messages.map((m) => m.id));
  for (const m of messages) {
    if (!m.id || seen.has(m.id)) continue;
    seen.add(m.id);
    dl.conversation.messages.push(m);
    if (m.ts && new Date(m.ts).getTime() > new Date(dl.session.lastSeen).getTime()) {
      dl.session.lastSeen = m.ts;
    }
  }
  if (meta?.intent) dl.conversation.intent = meta.intent as typeof dl.conversation.intent;
  if (meta?.sentiment)
    dl.conversation.sentiment = meta.sentiment as typeof dl.conversation.sentiment;
  // Reaching the chat implies at least "engaged".
  dl.lead.stage = advanceStage(dl.lead.stage, "engaged");
  persist(s);
  return dl;
}
