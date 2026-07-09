import type {
  AnalyticsEvent,
  ChangeSet,
  Conversation,
  DeviceContext,
  GeoContext,
  Intent,
  Lead,
  LeadStage,
  Message,
  Order,
  Preview,
  QuickReply,
  Sentiment,
  Session,
} from "@nutz/phillip";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../db/client";
import {
  events,
  type IterationRowStatus,
  conversations,
  escalations,
  iterations,
  leads,
  messages,
  orders,
  previews,
  settings,
  siteFiles,
  usageLedger,
  visitorSessions,
} from "../db/schema";
import { FUNNEL_ORDER } from "./analytics";
import type { DashboardLead } from "./types";

// The persistence seam, now on Turso/libsql via Drizzle. Rows re-assemble into
// the exact `DashboardLead` composite the analytics layer (metrics.ts,
// analytics.ts) consumes, so everything downstream of this file is unchanged
// from the JSON-store era — same functions, now async.

const nowIso = () => new Date().toISOString();

// Drizzle returns null for empty columns; the wire types use optional fields.
const orUndef = <T>(v: T | null): T | undefined => v ?? undefined;

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

// --- row → wire-shape assembly ------------------------------------------------

type LeadRow = typeof leads.$inferSelect;
type PreviewRow = typeof previews.$inferSelect;
type SessionRow = typeof visitorSessions.$inferSelect;
type EventRow = typeof events.$inferSelect;
type ConversationRow = typeof conversations.$inferSelect;
type MessageRow = typeof messages.$inferSelect;
type OrderRow = typeof orders.$inferSelect;

const defaultDevice = (): DeviceContext => ({
  type: "desktop",
  os: "unknown",
  browser: "unknown",
  viewport: { width: 0, height: 0 },
});

function toLead(r: LeadRow): Lead {
  return {
    id: r.id,
    business: r.business,
    contact: orUndef(r.contact),
    industry: orUndef(r.industry),
    email: orUndef(r.email),
    source: r.source,
    stage: r.stage,
    testMode: r.testMode,
  };
}

function toPreview(r: PreviewRow): Preview {
  return { id: r.id, leadId: r.leadId, url: r.url, version: r.version, status: r.status };
}

function toSession(r: SessionRow): Session {
  return {
    id: r.id,
    previewId: r.previewId,
    device: r.device ?? defaultDevice(),
    geo: orUndef(r.geo as GeoContext | null),
    referrer: orUndef(r.referrer),
    startedAt: r.startedAt,
    lastSeen: r.lastSeen,
    returning: r.returning,
  };
}

function toEvent(r: EventRow): AnalyticsEvent {
  return {
    id: r.id,
    sessionId: r.sessionId,
    type: r.type as AnalyticsEvent["type"],
    payload: r.payload as AnalyticsEvent["payload"],
    ts: r.ts,
  };
}

function toMessage(r: MessageRow): Message {
  return {
    id: r.id,
    role: r.role,
    text: r.text,
    ts: r.ts,
    intent: orUndef(r.intent),
    sentiment: orUndef(r.sentiment),
  };
}

function toConversation(c: ConversationRow, msgs: MessageRow[]): Conversation {
  return {
    id: c.id,
    sessionId: c.sessionId,
    channel: c.channel,
    messages: msgs.map(toMessage),
    intent: orUndef(c.intent),
    sentiment: orUndef(c.sentiment),
  };
}

function toOrder(r: OrderRow): Order {
  return {
    id: r.id,
    leadId: r.leadId,
    stripeId: orUndef(r.stripeSessionId),
    amount: r.amountTotal,
    currency: r.currency,
    status: r.status,
  };
}

// A lead registered before anyone opened its preview has no visitor session
// yet; synthesize a placeholder so DashboardLead.session is always present.
function placeholderSession(lead: LeadRow, previewId: string): Session {
  return {
    id: `ses_pending_${lead.id}`,
    previewId,
    device: defaultDevice(),
    startedAt: lead.createdAt,
    lastSeen: lead.updatedAt,
    returning: false,
  };
}

function assemble(
  lead: LeadRow,
  preview: PreviewRow | undefined,
  sessionRows: SessionRow[],
  eventRows: EventRow[],
  conversationRow: ConversationRow | undefined,
  messageRows: MessageRow[],
  orderRow: OrderRow | undefined,
): DashboardLead {
  const previewShape: Preview = preview
    ? toPreview(preview)
    : { id: `prv_${lead.id}`, leadId: lead.id, url: "", version: 1, status: "draft" };
  const latestSession = sessionRows
    .slice()
    .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())[0];
  const conversation =
    conversationRow && messageRows.length > 0
      ? toConversation(conversationRow, messageRows)
      : conversationRow
        ? toConversation(conversationRow, [])
        : undefined;
  return {
    lead: toLead(lead),
    preview: previewShape,
    session: latestSession ? toSession(latestSession) : placeholderSession(lead, previewShape.id),
    engagementScore: lead.engagementScore,
    events: eventRows
      .map(toEvent)
      .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()),
    conversation,
    order: orderRow ? toOrder(orderRow) : undefined,
  };
}

// Load every table once and group in memory. At funnel scale (hundreds of
// leads, not millions) this beats N+1 querying and keeps assembly obvious; a
// summary endpoint is the v1.1 optimization if polling cost ever bites.
async function loadComposites(leadId?: string): Promise<DashboardLead[]> {
  const [leadRows, previewRows, sessionRows, eventRows, convRows, orderRows] = await Promise.all([
    leadId ? db.select().from(leads).where(eq(leads.id, leadId)) : db.select().from(leads),
    leadId
      ? db.select().from(previews).where(eq(previews.leadId, leadId))
      : db.select().from(previews),
    leadId
      ? db.select().from(visitorSessions).where(eq(visitorSessions.leadId, leadId))
      : db.select().from(visitorSessions),
    leadId ? db.select().from(events).where(eq(events.leadId, leadId)) : db.select().from(events),
    leadId
      ? db.select().from(conversations).where(eq(conversations.leadId, leadId))
      : db.select().from(conversations),
    leadId ? db.select().from(orders).where(eq(orders.leadId, leadId)) : db.select().from(orders),
  ]);

  const convIds = convRows.map((c) => c.id);
  const messageRows = convIds.length
    ? await db
        .select()
        .from(messages)
        .where(inArray(messages.conversationId, convIds))
        .orderBy(messages.ts)
    : [];

  const byLead = {
    previews: groupBy(previewRows, (r) => r.leadId),
    sessions: groupBy(sessionRows, (r) => r.leadId),
    events: groupBy(eventRows, (r) => r.leadId),
    conversations: new Map(convRows.map((c) => [c.leadId, c] as const)),
    orders: groupBy(orderRows, (r) => r.leadId),
    messages: groupBy(messageRows, (r) => r.conversationId),
  };

  return leadRows.map((lead) => {
    const conv = byLead.conversations.get(lead.id);
    const leadOrders = (byLead.orders.get(lead.id) ?? [])
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return assemble(
      lead,
      (byLead.previews.get(lead.id) ?? [])[0],
      byLead.sessions.get(lead.id) ?? [],
      byLead.events.get(lead.id) ?? [],
      conv,
      conv ? (byLead.messages.get(conv.id) ?? []) : [],
      leadOrders[0],
    );
  });
}

function groupBy<T, K>(rows: T[], key: (r: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = m.get(k);
    if (list) list.push(r);
    else m.set(k, [r]);
  }
  return m;
}

// --- public API (the seam) ----------------------------------------------------

export async function getLeads(): Promise<DashboardLead[]> {
  const all = await loadComposites();
  return all.sort(
    (a, b) => new Date(b.session.lastSeen).getTime() - new Date(a.session.lastSeen).getTime(),
  );
}

export async function getLead(id: string): Promise<DashboardLead | undefined> {
  const [dl] = await loadComposites(id);
  return dl;
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

export async function upsertLead(input: LeadUpsert): Promise<DashboardLead> {
  const now = nowIso();
  const [existingLead] = await db.select().from(leads).where(eq(leads.id, input.lead.id));
  const [existingPreview] = existingLead
    ? await db.select().from(previews).where(eq(previews.leadId, input.lead.id))
    : [];

  const leadValues = {
    business: input.lead.business,
    contact: input.lead.contact ?? existingLead?.contact ?? null,
    industry: input.lead.industry ?? existingLead?.industry ?? null,
    email: input.lead.email ?? existingLead?.email ?? null,
    source: input.lead.source ?? existingLead?.source ?? "unknown",
    stage: input.lead.stage ?? existingLead?.stage ?? ("delivered" as LeadStage),
    engagementScore: input.engagementScore ?? existingLead?.engagementScore ?? 5,
    updatedAt: now,
  };
  if (existingLead) {
    await db.update(leads).set(leadValues).where(eq(leads.id, input.lead.id));
  } else {
    await db.insert(leads).values({ id: input.lead.id, createdAt: now, ...leadValues });
  }

  const previewId =
    input.preview?.id ?? input.session.previewId ?? existingPreview?.id ?? `prv_${input.lead.id}`;
  await db
    .insert(previews)
    .values({
      id: previewId,
      leadId: input.lead.id,
      url: input.preview?.url ?? existingPreview?.url ?? "",
      version: input.preview?.version ?? existingPreview?.version ?? 1,
      status: input.preview?.status ?? existingPreview?.status ?? "draft",
    })
    .onConflictDoUpdate({
      target: previews.id,
      set: {
        url: input.preview?.url ?? existingPreview?.url ?? "",
        version: input.preview?.version ?? existingPreview?.version ?? 1,
        status: input.preview?.status ?? existingPreview?.status ?? "draft",
      },
    });

  const [existingSession] = await db
    .select()
    .from(visitorSessions)
    .where(eq(visitorSessions.id, input.session.id));
  await db
    .insert(visitorSessions)
    .values({
      id: input.session.id,
      previewId,
      leadId: input.lead.id,
      device: input.session.device ?? existingSession?.device ?? defaultDevice(),
      geo: input.session.geo ?? existingSession?.geo ?? null,
      referrer: input.session.referrer ?? existingSession?.referrer ?? null,
      startedAt: input.session.startedAt ?? existingSession?.startedAt ?? now,
      lastSeen: now,
      returning: input.session.returning ?? existingSession?.returning ?? false,
    })
    .onConflictDoUpdate({
      target: visitorSessions.id,
      set: { lastSeen: now, previewId },
    });

  const dl = await getLead(input.lead.id);
  if (!dl) throw new Error(`upsertLead: lead ${input.lead.id} vanished mid-write`);
  return dl;
}

// Create a bare lead when analytics arrive before a lead was registered, so no
// signal is ever dropped.
async function ensureBySession(
  sessionId: string,
): Promise<{ leadId: string; sessionRow: typeof visitorSessions.$inferSelect }> {
  const [sessionRow] = await db
    .select()
    .from(visitorSessions)
    .where(eq(visitorSessions.id, sessionId));
  if (sessionRow) return { leadId: sessionRow.leadId, sessionRow };
  await upsertLead({
    lead: { id: `lead_${sessionId}`, business: "Unknown lead", stage: "opened" },
    session: { id: sessionId },
  });
  const [created] = await db
    .select()
    .from(visitorSessions)
    .where(eq(visitorSessions.id, sessionId));
  return { leadId: created.leadId, sessionRow: created };
}

export async function saveEvents(
  sessionId: string,
  incoming: AnalyticsEvent[],
): Promise<DashboardLead> {
  const { leadId, sessionRow } = await ensureBySession(sessionId);
  const [leadRow] = await db.select().from(leads).where(eq(leads.id, leadId));

  const withIds = incoming.filter((e) => e.id);
  const existing = withIds.length
    ? await db
        .select({ id: events.id })
        .from(events)
        .where(
          inArray(
            events.id,
            withIds.map((e) => e.id),
          ),
        )
    : [];
  const seen = new Set(existing.map((r) => r.id));
  const fresh: AnalyticsEvent[] = [];
  for (const e of withIds) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    fresh.push(e);
  }

  let stage = leadRow.stage;
  let score = leadRow.engagementScore;
  let lastTs = sessionRow.lastSeen;
  for (const e of fresh) {
    const implied = stageFromEvent(e);
    if (implied) stage = advanceStage(stage, implied);
    const p = e.payload as Record<string, unknown>;
    if (typeof p.score === "number") score = Math.max(score, Math.round(p.score));
    if (e.ts && new Date(e.ts).getTime() > new Date(lastTs).getTime()) lastTs = e.ts;
  }

  if (fresh.length) {
    await db
      .insert(events)
      .values(
        fresh.map((e) => ({
          id: e.id,
          sessionId,
          leadId,
          type: e.type,
          payload: e.payload,
          ts: e.ts,
        })),
      )
      .onConflictDoNothing();
  }
  await db
    .update(leads)
    .set({ stage, engagementScore: Math.min(100, score), updatedAt: nowIso() })
    .where(eq(leads.id, leadId));
  await db
    .update(visitorSessions)
    .set({ lastSeen: lastTs })
    .where(eq(visitorSessions.id, sessionId));

  const dl = await getLead(leadId);
  if (!dl) throw new Error(`saveEvents: lead ${leadId} vanished mid-write`);
  return dl;
}

export async function appendMessages(
  sessionId: string,
  incoming: Message[],
  meta?: { intent?: string; sentiment?: string },
): Promise<DashboardLead> {
  const { leadId, sessionRow } = await ensureBySession(sessionId);

  let [conv] = await db.select().from(conversations).where(eq(conversations.leadId, leadId));
  if (!conv) {
    const created = {
      id: `conv_${sessionId}`,
      leadId,
      sessionId,
      channel: "web" as const,
      intent: null,
      sentiment: null,
      lastQuickReplies: null,
    };
    await db.insert(conversations).values(created).onConflictDoNothing();
    [conv] = await db.select().from(conversations).where(eq(conversations.leadId, leadId));
  } else if (conv.sessionId !== sessionId) {
    // The thread follows the lead; point it at the most recent session.
    await db.update(conversations).set({ sessionId }).where(eq(conversations.id, conv.id));
  }

  const withIds = incoming.filter((m) => m.id);
  const existing = withIds.length
    ? await db
        .select({ id: messages.id })
        .from(messages)
        .where(
          inArray(
            messages.id,
            withIds.map((m) => m.id),
          ),
        )
    : [];
  const seen = new Set(existing.map((r) => r.id));
  const fresh = withIds.filter((m) => !seen.has(m.id));

  if (fresh.length) {
    await db
      .insert(messages)
      .values(
        fresh.map((m) => ({
          id: m.id,
          conversationId: conv.id,
          role: m.role,
          text: m.text,
          intent: m.intent ?? null,
          sentiment: m.sentiment ?? null,
          ts: m.ts,
        })),
      )
      .onConflictDoNothing();
  }

  if (meta?.intent || meta?.sentiment) {
    await db
      .update(conversations)
      .set({
        intent: (meta.intent as Intent | undefined) ?? conv.intent,
        sentiment: (meta.sentiment as Sentiment | undefined) ?? conv.sentiment,
      })
      .where(eq(conversations.id, conv.id));
  }

  const [leadRow] = await db.select().from(leads).where(eq(leads.id, leadId));
  // Reaching the chat implies at least "engaged".
  await db
    .update(leads)
    .set({ stage: advanceStage(leadRow.stage, "engaged"), updatedAt: nowIso() })
    .where(eq(leads.id, leadId));

  const maxTs = fresh.reduce(
    (acc, m) => (m.ts && new Date(m.ts).getTime() > new Date(acc).getTime() ? m.ts : acc),
    sessionRow.lastSeen,
  );
  if (maxTs !== sessionRow.lastSeen) {
    await db
      .update(visitorSessions)
      .set({ lastSeen: maxTs })
      .where(eq(visitorSessions.id, sessionId));
  }

  const dl = await getLead(leadId);
  if (!dl) throw new Error(`appendMessages: lead ${leadId} vanished mid-write`);
  return dl;
}

// --- lead / preview helpers ----------------------------------------------------

export async function getLeadByPreviewId(previewId: string) {
  const [preview] = await db.select().from(previews).where(eq(previews.id, previewId));
  if (!preview) return undefined;
  const [lead] = await db.select().from(leads).where(eq(leads.id, preview.leadId));
  if (!lead) return undefined;
  return { lead, preview };
}

export async function getLeadRow(leadId: string) {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  return lead;
}

export async function updateLeadFields(
  leadId: string,
  patch: Partial<Omit<typeof leads.$inferInsert, "id" | "createdAt">>,
) {
  await db
    .update(leads)
    .set({ ...patch, updatedAt: nowIso() })
    .where(eq(leads.id, leadId));
}

export async function advanceLeadStage(leadId: string, candidate: LeadStage) {
  const [row] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!row) return;
  const next = advanceStage(row.stage, candidate);
  if (next !== row.stage) {
    await db.update(leads).set({ stage: next, updatedAt: nowIso() }).where(eq(leads.id, leadId));
  }
}

export async function updatePreview(
  previewId: string,
  patch: Partial<Omit<typeof previews.$inferInsert, "id" | "leadId">>,
) {
  await db.update(previews).set(patch).where(eq(previews.id, previewId));
}

// --- visitor sessions ----------------------------------------------------------

export async function createVisitorSession(input: {
  previewId: string;
  leadId: string;
  device?: DeviceContext;
  geo?: GeoContext;
  referrer?: string;
}) {
  const now = nowIso();
  const prior = await db
    .select({ id: visitorSessions.id })
    .from(visitorSessions)
    .where(eq(visitorSessions.leadId, input.leadId));
  const row = {
    id: `ses_${nanoid(16)}`,
    previewId: input.previewId,
    leadId: input.leadId,
    device: input.device ?? null,
    geo: input.geo ?? null,
    referrer: input.referrer ?? null,
    startedAt: now,
    lastSeen: now,
    returning: prior.length > 0,
  };
  await db.insert(visitorSessions).values(row);
  return row;
}

export async function getVisitorSession(sessionId: string) {
  const [row] = await db.select().from(visitorSessions).where(eq(visitorSessions.id, sessionId));
  return row;
}

// --- conversations (chat backend) ----------------------------------------------

export async function getConversationForLead(leadId: string): Promise<Conversation | undefined> {
  const [conv] = await db.select().from(conversations).where(eq(conversations.leadId, leadId));
  if (!conv) return undefined;
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conv.id))
    .orderBy(messages.ts);
  return toConversation(conv, msgs);
}

export async function getConversationRow(leadId: string) {
  const [conv] = await db.select().from(conversations).where(eq(conversations.leadId, leadId));
  return conv;
}

// Persist the opening greeting at boot, so resumed histories start with the
// agent instead of the lead. Callers re-fetch the conversation afterwards.
export async function seedConversation(
  leadId: string,
  sessionId: string,
  greetingText: string,
): Promise<void> {
  let [conv] = await db.select().from(conversations).where(eq(conversations.leadId, leadId));
  if (!conv) {
    await db
      .insert(conversations)
      .values({
        id: `conv_${sessionId}`,
        leadId,
        sessionId,
        channel: "web" as const,
        intent: null,
        sentiment: null,
        lastQuickReplies: null,
      })
      .onConflictDoNothing();
    [conv] = await db.select().from(conversations).where(eq(conversations.leadId, leadId));
  }
  if (!conv) return;

  // Re-count right before inserting — a concurrent boot may have seeded (or a
  // message may have landed) between the caller's check and now.
  const [count] = await db
    .select({ n: sql<number>`count(*)` })
    .from(messages)
    .where(eq(messages.conversationId, conv.id));
  if ((count?.n ?? 0) > 0) return;

  await db.insert(messages).values({
    id: `msg_${nanoid(10)}`,
    conversationId: conv.id,
    role: "phillip",
    text: greetingText,
    intent: null,
    sentiment: null,
    ts: nowIso(),
  });
}

export async function setConversationQuickReplies(conversationId: string, qrs: QuickReply[]) {
  await db
    .update(conversations)
    .set({ lastQuickReplies: qrs })
    .where(eq(conversations.id, conversationId));
}

// --- budget / usage --------------------------------------------------------------

export async function spendForLead(leadId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${usageLedger.costUsd}), 0)` })
    .from(usageLedger)
    .where(eq(usageLedger.leadId, leadId));
  return row?.total ?? 0;
}

export async function recordUsage(input: {
  leadId: string;
  kind: "chat" | "iteration";
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}) {
  await db.insert(usageLedger).values({ ...input, createdAt: nowIso() });
}

export async function usageForLead(leadId: string) {
  return db
    .select()
    .from(usageLedger)
    .where(eq(usageLedger.leadId, leadId))
    .orderBy(desc(usageLedger.createdAt));
}

// --- site files (iteration executor) ----------------------------------------------

export async function getSiteFiles(leadId: string): Promise<{ path: string; content: string }[]> {
  const rows = await db.select().from(siteFiles).where(eq(siteFiles.leadId, leadId));
  return rows.map((r) => ({ path: r.path, content: r.content }));
}

export async function putSiteFiles(leadId: string, files: { path: string; content: string }[]) {
  const now = nowIso();
  for (const f of files) {
    await db
      .insert(siteFiles)
      .values({ leadId, path: f.path, content: f.content, updatedAt: now })
      .onConflictDoUpdate({
        target: [siteFiles.leadId, siteFiles.path],
        set: { content: f.content, updatedAt: now },
      });
  }
}

export async function deleteSiteFile(leadId: string, path: string) {
  await db.delete(siteFiles).where(and(eq(siteFiles.leadId, leadId), eq(siteFiles.path, path)));
}

// --- iterations --------------------------------------------------------------------

export async function createIteration(input: {
  leadId: string;
  previewId: string;
  sessionId?: string;
  round: number;
  changeSet: ChangeSet;
  status: IterationRowStatus;
  statusReason?: string;
}) {
  const now = nowIso();
  const row = {
    id: `itr_${nanoid(12)}`,
    leadId: input.leadId,
    previewId: input.previewId,
    sessionId: input.sessionId ?? null,
    round: input.round,
    changeSet: input.changeSet,
    status: input.status,
    statusReason: input.statusReason ?? null,
    resultUrl: null,
    version: null,
    deploymentId: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(iterations).values(row);
  return row;
}

export async function updateIteration(
  id: string,
  patch: Partial<Omit<typeof iterations.$inferInsert, "id" | "createdAt">>,
) {
  await db
    .update(iterations)
    .set({ ...patch, updatedAt: nowIso() })
    .where(eq(iterations.id, id));
}

export async function getIteration(id: string) {
  const [row] = await db.select().from(iterations).where(eq(iterations.id, id));
  return row;
}

export async function countIterations(leadId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(iterations)
    .where(eq(iterations.leadId, leadId));
  return row?.n ?? 0;
}

export async function listIterations() {
  return db
    .select({
      iteration: iterations,
      business: leads.business,
    })
    .from(iterations)
    .leftJoin(leads, eq(iterations.leadId, leads.id))
    .orderBy(desc(iterations.createdAt));
}

// --- orders ---------------------------------------------------------------------

export async function createOrder(input: {
  leadId: string;
  stripeSessionId: string;
  amountTotal: number;
  currency: string;
}) {
  const now = nowIso();
  const row = {
    id: `ord_${nanoid(12)}`,
    leadId: input.leadId,
    stripeSessionId: input.stripeSessionId,
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    amountTotal: input.amountTotal,
    currency: input.currency,
    status: "pending" as const,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(orders).values(row);
  return row;
}

export async function markOrderBySession(
  stripeSessionId: string,
  patch: Partial<
    Pick<
      typeof orders.$inferInsert,
      "status" | "stripeSubscriptionId" | "stripeCustomerId" | "amountTotal"
    >
  >,
) {
  const [row] = await db.select().from(orders).where(eq(orders.stripeSessionId, stripeSessionId));
  if (!row) return undefined;
  await db
    .update(orders)
    .set({ ...patch, updatedAt: nowIso() })
    .where(eq(orders.id, row.id));
  return row;
}

// --- escalations ------------------------------------------------------------------

export async function createEscalation(input: {
  leadId: string;
  sessionId?: string;
  email: string;
  reason?: string;
}) {
  const row = {
    id: `esc_${nanoid(12)}`,
    leadId: input.leadId,
    sessionId: input.sessionId ?? null,
    email: input.email,
    reason: input.reason ?? null,
    status: "open" as const,
    createdAt: nowIso(),
  };
  await db.insert(escalations).values(row);
  return row;
}

export async function listEscalations(leadId?: string) {
  const q = db.select().from(escalations);
  return leadId ? q.where(eq(escalations.leadId, leadId)) : q;
}

export async function updateEscalation(id: string, patch: { status: "open" | "handled" }) {
  await db.update(escalations).set(patch).where(eq(escalations.id, id));
}

// --- settings ---------------------------------------------------------------------

export interface PricingSettings {
  setupAmountCents: number;
  monthlyAmountCents: number;
  currency: string;
}

export interface PersonaSettings {
  name: string;
  title: string;
  avatarUrl: string;
}

export const DEFAULT_PRICING: PricingSettings = {
  setupAmountCents: 29900,
  monthlyAmountCents: 4900,
  currency: "eur",
};

export const DEFAULT_PERSONA: PersonaSettings = {
  name: "Phillip",
  title: "founder · nutz",
  avatarUrl: "/phillip.jpg",
};

/** Remove a lead and every trace of it — previews, sessions, events, the
 *  conversation + messages, iterations, orders, escalations, site files, and
 *  usage. Irreversible; callers gate paid/live leads. */
export async function deleteLead(leadId: string): Promise<void> {
  const convRows = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.leadId, leadId));
  const convIds = convRows.map((c) => c.id);
  if (convIds.length > 0) {
    await db.delete(messages).where(inArray(messages.conversationId, convIds));
  }
  await db.delete(conversations).where(eq(conversations.leadId, leadId));
  await db.delete(events).where(eq(events.leadId, leadId));
  await db.delete(visitorSessions).where(eq(visitorSessions.leadId, leadId));
  await db.delete(iterations).where(eq(iterations.leadId, leadId));
  await db.delete(orders).where(eq(orders.leadId, leadId));
  await db.delete(escalations).where(eq(escalations.leadId, leadId));
  await db.delete(siteFiles).where(eq(siteFiles.leadId, leadId));
  await db.delete(usageLedger).where(eq(usageLedger.leadId, leadId));
  await db.delete(previews).where(eq(previews.leadId, leadId));
  await db.delete(leads).where(eq(leads.id, leadId));
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  return row ? (row.value as T) : fallback;
}

export async function setSetting(key: string, value: unknown) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

// Insert a synthetic analytics event from the backend (webhook, executor) so
// the funnel/timeline reflect off-page milestones too.
export async function insertBackendEvent(
  leadId: string,
  sessionId: string,
  type: AnalyticsEvent["type"],
  payload: Record<string, unknown>,
) {
  await db
    .insert(events)
    .values({
      id: `evt_${nanoid(12)}`,
      sessionId,
      leadId,
      type,
      payload,
      ts: nowIso(),
    })
    .onConflictDoNothing();
}
