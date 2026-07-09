import type { TransportClient } from "../transport";
import type { CheckoutResponse } from "../transport/types";
import type { Offer } from "../types/boot";

// Phase 06 — Close & payment. The backend creates a Stripe Checkout Session
// and returns its hosted-page url; the widget opens it in a new tab (never
// inside our shadow root). The lead only becomes a customer once the payment
// webhook verifies — the client never flips paid state itself.

/** Format an amount in the offer's currency; defaults to the one-time price. */
export function formatPrice(offer: Offer, amount: number = offer.amount): string {
  return (amount / 100).toLocaleString("en-US", {
    style: "currency",
    currency: offer.currency.toUpperCase(),
  });
}

export async function openCheckout(
  client: TransportClient,
  sessionId: string,
): Promise<CheckoutResponse> {
  return client.checkout(sessionId);
}
