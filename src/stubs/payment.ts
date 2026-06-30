import type { TransportClient } from "../transport";
import type { CheckoutResponse } from "../transport/types";
import type { Offer } from "../types/boot";

// Phase 06 — Close & payment (STUB). Real impl creates a Stripe Checkout
// Session and either redirects to the hosted page or mounts Embedded Checkout
// in a LIGHT-DOM portal (never inside our shadow root); the payment webhook is
// verified before the lead becomes a customer. v0 returns the mock session and
// the caller simulates success.

export function formatPrice(offer: Offer): string {
  return (offer.amount / 100).toLocaleString("en-US", {
    style: "currency",
    currency: offer.currency.toUpperCase(),
  });
}

export async function openCheckout(
  client: TransportClient,
  sessionId: string,
): Promise<CheckoutResponse> {
  // TODO: real Stripe Checkout Session + webhook verification.
  return client.checkout(sessionId);
}
