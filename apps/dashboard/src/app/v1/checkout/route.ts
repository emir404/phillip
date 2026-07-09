import { eq } from "drizzle-orm";
import { db } from "../../../db/client";
import { previews } from "../../../db/schema";
import { corsJson, preflight } from "../../../lib/cors";
import {
  DEFAULT_PRICING,
  type PricingSettings,
  advanceLeadStage,
  createOrder,
  getLeadRow,
  getSetting,
  getVisitorSession,
  insertBackendEvent,
} from "../../../lib/store";
import { stripe } from "../../../lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

// Real Stripe Checkout: one-time setup fee + monthly hosting in a single
// subscription-mode session (the one-time item bills on the first invoice).
export async function POST(req: Request) {
  let body: { sessionId?: string };
  try {
    body = (await req.json()) as { sessionId?: string };
  } catch {
    return corsJson({ error: "invalid json" }, { status: 400 });
  }
  if (!body?.sessionId) return corsJson({ error: "sessionId required" }, { status: 400 });

  const session = await getVisitorSession(body.sessionId);
  if (!session) return corsJson({ error: "unknown session" }, { status: 404 });
  const lead = await getLeadRow(session.leadId);
  if (!lead) return corsJson({ error: "unknown lead" }, { status: 404 });

  const pricing = await getSetting<PricingSettings>("pricing", DEFAULT_PRICING);
  const setupCents = lead.setupAmountCents ?? pricing.setupAmountCents;
  const monthlyCents = lead.monthlyAmountCents ?? pricing.monthlyAmountCents;

  const [preview] = await db.select().from(previews).where(eq(previews.leadId, lead.id));
  const returnBase = preview?.url || process.env.BETTER_AUTH_URL || new URL(req.url).origin;

  let checkout: Awaited<ReturnType<ReturnType<typeof stripe>["checkout"]["sessions"]["create"]>>;
  try {
    checkout = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: pricing.currency,
            unit_amount: monthlyCents,
            recurring: { interval: "month" },
            product_data: { name: `website hosting — ${lead.business}` },
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: pricing.currency,
            unit_amount: setupCents,
            product_data: { name: `site setup — ${lead.business}` },
          },
          quantity: 1,
        },
      ],
      client_reference_id: lead.id,
      metadata: { leadId: lead.id, sessionId: body.sessionId },
      customer_email: lead.email ?? undefined,
      success_url: `${returnBase}?phillip=paid`,
      cancel_url: `${returnBase}?phillip=checkout_cancelled`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("stripe checkout failed:", msg);
    return corsJson({ error: "checkout unavailable" }, { status: 503 });
  }

  await createOrder({
    leadId: lead.id,
    stripeSessionId: checkout.id,
    amountTotal: setupCents + monthlyCents,
    currency: pricing.currency,
  });
  await advanceLeadStage(lead.id, "checkout");
  await insertBackendEvent(lead.id, body.sessionId, "checkout_started", {
    stripeSessionId: checkout.id,
  });

  return corsJson({ checkoutUrl: checkout.url });
}
