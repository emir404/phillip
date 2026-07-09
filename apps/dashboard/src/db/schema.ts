import type {
  ChangeSet,
  DeviceContext,
  GeoContext,
  Intent,
  LeadStage,
  OrderStatus,
  PreviewStatus,
  QuickReply,
  Sentiment,
} from "@nutz/phillip";
import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// All timestamps are ISO-8601 text (the wire format the embed and dashboard
// already speak); JSON columns hold the shared record shapes from
// @nutz/phillip so nothing is re-modelled — the DB rows reassemble into the
// exact `DashboardLead` composite the analytics layer consumes.

export const leads = sqliteTable("leads", {
  id: text("id").primaryKey(),
  business: text("business").notNull(),
  contact: text("contact"),
  industry: text("industry"),
  email: text("email"),
  source: text("source").notNull().default("unknown"),
  stage: text("stage").$type<LeadStage>().notNull().default("delivered"),
  engagementScore: integer("engagement_score").notNull().default(5),
  // The Vercel project the lead's preview site deploys to (iteration executor).
  vercelProjectId: text("vercel_project_id"),
  // Repo-backed leads: iterations edit source in this GitHub repo, commit, and
  // let the repo's own Vercel integration build it. Null = the site source
  // lives in site_files and the executor deploys files directly.
  repoUrl: text("repo_url"),
  repoBranch: text("repo_branch"),
  // Per-lead overrides; null = use the global settings.
  budgetCapUsd: real("budget_cap_usd"),
  setupAmountCents: integer("setup_amount_cents"),
  monthlyAmountCents: integer("monthly_amount_cents"),
  // Test-mode leads run checkout against Stripe's test keys — full purchase
  // rehearsals (4242… card) with zero real money.
  testMode: integer("test_mode", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const previews = sqliteTable(
  "previews",
  {
    // Public capability token (prv_<nanoid>) — unguessable by design; it is the
    // only credential a preview site carries.
    id: text("id").primaryKey(),
    leadId: text("lead_id").notNull(),
    url: text("url").notNull().default(""),
    version: integer("version").notNull().default(1),
    status: text("status").$type<PreviewStatus>().notNull().default("draft"),
  },
  (t) => [index("previews_lead_idx").on(t.leadId)],
);

export const visitorSessions = sqliteTable(
  "visitor_sessions",
  {
    id: text("id").primaryKey(),
    previewId: text("preview_id").notNull(),
    leadId: text("lead_id").notNull(),
    device: text("device", { mode: "json" }).$type<DeviceContext>(),
    geo: text("geo", { mode: "json" }).$type<GeoContext>(),
    referrer: text("referrer"),
    startedAt: text("started_at").notNull(),
    lastSeen: text("last_seen").notNull(),
    returning: integer("returning", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [
    index("visitor_sessions_lead_idx").on(t.leadId),
    index("visitor_sessions_preview_idx").on(t.previewId),
  ],
);

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    leadId: text("lead_id").notNull(),
    type: text("type").notNull(),
    payload: text("payload", { mode: "json" }).notNull(),
    ts: text("ts").notNull(),
  },
  (t) => [
    index("events_lead_ts_idx").on(t.leadId, t.ts),
    index("events_session_idx").on(t.sessionId),
  ],
);

export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    // One conversation per lead: sessions come and go, the thread persists.
    leadId: text("lead_id").notNull().unique(),
    sessionId: text("session_id").notNull(),
    channel: text("channel").$type<"web" | "email">().notNull().default("web"),
    intent: text("intent").$type<Intent>(),
    sentiment: text("sentiment").$type<Sentiment>(),
    // The last set of model-proposed quick replies, so a click (which sends
    // only the id) can be resolved back to its label.
    lastQuickReplies: text("last_quick_replies", { mode: "json" }).$type<QuickReply[]>(),
  },
  (t) => [index("conversations_session_idx").on(t.sessionId)],
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id").notNull(),
    role: text("role").$type<"phillip" | "lead" | "system">().notNull(),
    text: text("text").notNull(),
    intent: text("intent").$type<Intent>(),
    sentiment: text("sentiment").$type<Sentiment>(),
    ts: text("ts").notNull(),
  },
  (t) => [index("messages_conversation_ts_idx").on(t.conversationId, t.ts)],
);

export type IterationRowStatus = "queued" | "processing" | "done" | "failed" | "queued_manual";

export const iterations = sqliteTable(
  "iterations",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id").notNull(),
    previewId: text("preview_id").notNull(),
    sessionId: text("session_id"),
    round: integer("round").notNull().default(1),
    changeSet: text("change_set", { mode: "json" }).$type<ChangeSet>().notNull(),
    status: text("status").$type<IterationRowStatus>().notNull().default("queued"),
    // Why it needs a human: "no_source" | "budget" | "error:<detail>".
    statusReason: text("status_reason"),
    resultUrl: text("result_url"),
    version: integer("version"),
    deploymentId: text("deployment_id"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("iterations_lead_idx").on(t.leadId), index("iterations_status_idx").on(t.status)],
);

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id").notNull(),
    stripeSessionId: text("stripe_session_id").unique(),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripeCustomerId: text("stripe_customer_id"),
    amountTotal: integer("amount_total").notNull().default(0),
    currency: text("currency").notNull().default("eur"),
    status: text("status").$type<OrderStatus>().notNull().default("pending"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("orders_lead_idx").on(t.leadId)],
);

export const escalations = sqliteTable(
  "escalations",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id").notNull(),
    sessionId: text("session_id"),
    email: text("email").notNull(),
    reason: text("reason"),
    status: text("status").$type<"open" | "handled">().notNull().default("open"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("escalations_lead_idx").on(t.leadId)],
);

// Latest version of each preview-site source file; history lives in Vercel
// deployments, not here.
export const siteFiles = sqliteTable(
  "site_files",
  {
    leadId: text("lead_id").notNull(),
    path: text("path").notNull(),
    content: text("content").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.leadId, t.path] })],
);

// Every LLM call (chat turn or iteration) lands here; the sum enforces the
// per-lead budget cap.
export const usageLedger = sqliteTable(
  "usage_ledger",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    leadId: text("lead_id").notNull(),
    kind: text("kind").$type<"chat" | "iteration">().notNull(),
    model: text("model").notNull(),
    // Uncached input only — the cached prefix bills separately at 1.25x (write)
    // and 0.1x (read), so all three are kept apart for honest cost math.
    inputTokens: integer("input_tokens").notNull().default(0),
    cacheCreationTokens: integer("cache_creation_tokens").notNull().default(0),
    cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costUsd: real("cost_usd").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("usage_ledger_lead_idx").on(t.leadId)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
});

// better-auth tables (user/session/account/verification) — generated by
// `npx @better-auth/cli generate`, re-exported so drizzle-kit sees one schema.
export * from "./auth-schema";
