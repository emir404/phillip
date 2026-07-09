import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { db } from "../src/db/client";
import {
  events,
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
} from "../src/db/schema";
import { auth } from "../src/lib/auth";
import { sampleLeads } from "../src/lib/seed-data";
import { DEFAULT_PERSONA, DEFAULT_PRICING } from "../src/lib/store";

// Seed the database with the demo book of leads (same fixtures the JSON store
// used to boot with), the settings defaults, the demo site source for
// lead_forge (so the iteration executor has something real to edit), and the
// team login. Idempotent: skips lead data if any lead exists, unless --force.
//
//   pnpm --filter @nutz/dashboard db:seed [-- --force]

const here = dirname(fileURLToPath(import.meta.url));
const force = process.argv.includes("--force");

async function seedLeads() {
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(leads);
  if (n > 0 && !force) {
    console.log(`· leads: ${n} rows already present — skipping (use --force to reseed)`);
    return;
  }
  if (force) {
    for (const t of [
      messages,
      conversations,
      events,
      visitorSessions,
      iterations,
      orders,
      escalations,
      siteFiles,
      usageLedger,
      previews,
      leads,
    ]) {
      await db.delete(t);
    }
  }

  for (const dl of sampleLeads) {
    await db.insert(leads).values({
      id: dl.lead.id,
      business: dl.lead.business,
      contact: dl.lead.contact ?? null,
      industry: dl.lead.industry ?? null,
      email: dl.lead.email ?? null,
      source: dl.lead.source,
      stage: dl.lead.stage,
      engagementScore: dl.engagementScore,
      createdAt: dl.session.startedAt,
      updatedAt: dl.session.lastSeen,
    });
    await db.insert(previews).values({
      id: dl.preview.id,
      leadId: dl.lead.id,
      url: dl.preview.url,
      version: dl.preview.version,
      status: dl.preview.status,
    });
    await db.insert(visitorSessions).values({
      id: dl.session.id,
      previewId: dl.session.previewId,
      leadId: dl.lead.id,
      device: dl.session.device,
      geo: dl.session.geo ?? null,
      referrer: dl.session.referrer ?? null,
      startedAt: dl.session.startedAt,
      lastSeen: dl.session.lastSeen,
      returning: dl.session.returning,
    });
    if (dl.events.length) {
      await db.insert(events).values(
        dl.events.map((e) => ({
          id: e.id,
          sessionId: e.sessionId,
          leadId: dl.lead.id,
          type: e.type,
          payload: e.payload,
          ts: e.ts,
        })),
      );
    }
    if (dl.conversation) {
      await db.insert(conversations).values({
        id: dl.conversation.id,
        leadId: dl.lead.id,
        sessionId: dl.conversation.sessionId,
        channel: dl.conversation.channel,
        intent: dl.conversation.intent ?? null,
        sentiment: dl.conversation.sentiment ?? null,
        lastQuickReplies: null,
      });
      if (dl.conversation.messages.length) {
        await db.insert(messages).values(
          dl.conversation.messages.map((m) => ({
            id: m.id,
            conversationId: dl.conversation?.id ?? "",
            role: m.role,
            text: m.text,
            intent: m.intent ?? null,
            sentiment: m.sentiment ?? null,
            ts: m.ts,
          })),
        );
      }
    }
    if (dl.order) {
      await db.insert(orders).values({
        id: dl.order.id,
        leadId: dl.lead.id,
        stripeSessionId: dl.order.stripeId ?? null,
        amountTotal: dl.order.amount,
        currency: dl.order.currency,
        status: dl.order.status,
        createdAt: dl.session.startedAt,
        updatedAt: dl.session.lastSeen,
      });
    }
  }
  console.log(`· leads: seeded ${sampleLeads.length}`);

  // Demo site source for Forge Barbers so an iteration can actually run.
  const demoHtml = readFileSync(join(here, "fixtures", "demo-site", "index.html"), "utf8");
  await db
    .insert(siteFiles)
    .values({
      leadId: "lead_forge",
      path: "index.html",
      content: demoHtml,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoNothing();
  console.log("· site files: demo source attached to lead_forge");
}

async function seedSettings() {
  const defaults: [string, unknown][] = [
    ["pricing", DEFAULT_PRICING],
    ["persona", DEFAULT_PERSONA],
    ["budgetCapUsd", Number(process.env.PHILLIP_BUDGET_CAP_USD ?? 5)],
    ["escalationEmail", "team@nutz.inc"],
  ];
  for (const [key, value] of defaults) {
    await db.insert(settings).values({ key, value }).onConflictDoNothing();
  }
  console.log("· settings: defaults ensured");
}

async function seedTeam() {
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    console.warn("· team: SEED_ADMIN_PASSWORD not set — skipping user creation");
    return;
  }
  const emails = (process.env.SEED_ADMIN_EMAILS ?? "emir@witharc.co")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  for (const email of emails) {
    try {
      await auth.api.signUpEmail({
        body: { email, password, name: email.split("@")[0] },
      });
      console.log(`· team: created ${email}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/exist/i.test(msg)) console.log(`· team: ${email} already exists`);
      else throw err;
    }
  }
}

async function main() {
  await seedLeads();
  await seedSettings();
  await seedTeam();
  console.log("seed complete ✓");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
