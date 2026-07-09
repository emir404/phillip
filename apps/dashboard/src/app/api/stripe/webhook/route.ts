import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  advanceLeadStage,
  getLeadRow,
  insertBackendEvent,
  markOrderBySession,
  updateLeadFields,
} from "../../../../lib/store";
import { stripe } from "../../../../lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe is the source of truth for "paid" — the widget never flips that state
// client-side. Idempotent: marking an already-paid order paid is a no-op.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 400 });
  }

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const order = await markOrderBySession(session.id, {
      status: "paid",
      stripeSubscriptionId:
        typeof session.subscription === "string"
          ? session.subscription
          : (session.subscription?.id ?? null),
      stripeCustomerId:
        typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null),
      amountTotal: session.amount_total ?? undefined,
    });
    if (order) {
      await advanceLeadStage(order.leadId, "paid");
      await insertBackendEvent(order.leadId, session.metadata?.sessionId ?? "stripe", "paid", {
        amount: session.amount_total,
        stripeSessionId: session.id,
      });
      const lead = await getLeadRow(order.leadId);
      const email = session.customer_details?.email;
      if (lead && !lead.email && email) {
        await updateLeadFields(order.leadId, { email });
      }
    }
  } else if (event.type === "checkout.session.expired") {
    await markOrderBySession(event.data.object.id, { status: "failed" });
  }

  return NextResponse.json({ received: true });
}
