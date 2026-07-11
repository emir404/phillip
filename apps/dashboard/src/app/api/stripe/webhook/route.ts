import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  advanceLeadStage,
  appendMessages,
  getConversationRow,
  getLeadRow,
  getPersona,
  insertBackendEvent,
  markOrderBySession,
  resolveLanguage,
  updateLeadFields,
} from "../../../../lib/store";
import { type StripeMode, stripe } from "../../../../lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe is the source of truth for "paid" — the widget never flips that state
// client-side. Idempotent: marking an already-paid order paid is a no-op.
// One URL serves BOTH Stripe modes (endpoints are registered per mode, each
// with its own signing secret) — verify against live first, then test.
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_TEST_WEBHOOK_SECRET];
  if (!signature || !secrets.some(Boolean)) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 400 });
  }

  const payload = await req.text();
  let event: Stripe.Event | null = null;
  for (const secret of secrets) {
    if (!secret) continue;
    try {
      event = stripe().webhooks.constructEvent(payload, signature, secret);
      break;
    } catch {
      // try the other mode's secret
    }
  }
  if (!event) {
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
      // markOrderBySession returns the PRE-update row, so a "paid" status here
      // means Stripe re-delivered the event — the invoice already went out.
      if (order.status !== "paid") {
        try {
          await deliverInvoice(session, order.leadId, event.livemode ? "live" : "test");
        } catch (err) {
          console.error("invoice delivery failed (non-fatal):", err);
        }
      }
    }
  } else if (event.type === "checkout.session.expired") {
    await markOrderBySession(event.data.object.id, { status: "failed" });
  } else if (event.type === "invoice.paid") {
    // Bank-debit payments settle days after checkout, and Stripe refuses a
    // receipt_email while the payment is `processing` — deliverInvoice already
    // put the invoice in the thread at checkout time; this closes the email
    // half once the money has actually moved. Also fires for each monthly
    // hosting invoice, so every settled payment gets its receipt.
    try {
      await emailSettledReceipt(event.data.object, event.livemode ? "live" : "test");
    } catch (err) {
      console.error("settled receipt failed (non-fatal):", err);
    }
  }

  return NextResponse.json({ received: true });
}

async function emailSettledReceipt(invoice: Stripe.Invoice, mode: StripeMode): Promise<void> {
  const invoiceId = invoice.id;
  const email = invoice.customer_email;
  if (!invoiceId || !email) return;
  // The event payload never carries `payments` (expand-only) — re-fetch.
  const full = await stripe(mode).invoices.retrieve(invoiceId, { expand: ["payments"] });
  const payment = full.payments?.data?.[0]?.payment;
  const paymentIntentId =
    typeof payment?.payment_intent === "string"
      ? payment.payment_intent
      : payment?.payment_intent?.id;
  if (!paymentIntentId) return;
  const pi = await stripe(mode).paymentIntents.retrieve(paymentIntentId);
  // Already emailed (receipt_email set sends immediately on a succeeded
  // payment; setting it again would re-send) or not actually settled yet.
  if (pi.receipt_email || pi.status !== "succeeded") return;
  await stripe(mode).paymentIntents.update(paymentIntentId, { receipt_email: email });
  console.log("receipt emailed:", invoiceId, "->", email);
}

// The sale's paper trail, sent through Phillip: the widget itself goes silent
// the moment the lead pays (see the boot route), so the agent's final act is
// dropping the Stripe invoice into the thread — where the dashboard shows it —
// and having Stripe email the receipt to the customer. Subscription-mode
// checkout always finalizes a first invoice, so the links exist by the time
// checkout.session.completed fires.
async function deliverInvoice(
  session: Stripe.Checkout.Session,
  leadId: string,
  mode: StripeMode,
): Promise<void> {
  const invoiceId = typeof session.invoice === "string" ? session.invoice : session.invoice?.id;
  if (!invoiceId) return;
  // `payments` is expand-only; it carries the payment intent the receipt
  // email hangs off (the invoice itself lost `charge`/`payment_intent` in
  // Stripe's Basil API).
  const invoice = await stripe(mode).invoices.retrieve(invoiceId, { expand: ["payments"] });
  const url = invoice.hosted_invoice_url ?? invoice.invoice_pdf;
  if (!url) return;

  const [lead, persona] = await Promise.all([getLeadRow(leadId), getPersona()]);
  const language = resolveLanguage(lead?.language ?? null, persona.language);
  const nr = invoice.number ? ` (Nr. ${invoice.number})` : "";
  const pdfLine = invoice.invoice_pdf && invoice.hosted_invoice_url ? invoice.invoice_pdf : null;
  const text =
    language === "de"
      ? `Zahlung eingegangen — vielen Dank! Deine Rechnung${nr}: ${url}` +
        (pdfLine ? `\nAls PDF: ${pdfLine}` : "") +
        `\nEine Kopie geht dir per E-Mail zu.`
      : `Payment received — thank you! Your invoice${invoice.number ? ` (no. ${invoice.number})` : ""}: ${url}` +
        (pdfLine ? `\nAs PDF: ${pdfLine}` : "") +
        `\nA copy is on its way to your email.`;

  // The thread follows the lead — reuse its session when checkout metadata is
  // missing. The deterministic id makes webhook retries a no-op in the DB too.
  const sessionId =
    session.metadata?.sessionId ?? (await getConversationRow(leadId))?.sessionId ?? null;
  if (sessionId) {
    await appendMessages(sessionId, [
      {
        id: `msg_inv_${invoiceId}`,
        role: "phillip",
        text,
        ts: new Date().toISOString(),
      },
    ]);
  }

  // Stripe emails a receipt when a succeeded payment's receipt_email is set —
  // independent of the account's email settings (live mode only; test mode
  // never sends email). Best-effort: bank-debit payments sit in `processing`
  // for days and reject the update — the thread message above already carries
  // the invoice, so a refused receipt must not fail the delivery.
  const email = session.customer_details?.email ?? lead?.email;
  const payment = invoice.payments?.data?.[0]?.payment;
  const paymentIntentId =
    typeof payment?.payment_intent === "string"
      ? payment.payment_intent
      : payment?.payment_intent?.id;
  if (email && paymentIntentId) {
    try {
      await stripe(mode).paymentIntents.update(paymentIntentId, { receipt_email: email });
    } catch (err) {
      console.error("receipt email skipped (non-fatal):", err);
    }
  }
}
