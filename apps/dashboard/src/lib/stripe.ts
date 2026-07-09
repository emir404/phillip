import Stripe from "stripe";

// Lazy singleton so builds/dev without a key still boot; routes that need
// Stripe fail with a clear message instead of at import time.
const GLOBAL_KEY = "__phillip_stripe__";

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  const g = globalThis as unknown as Record<string, Stripe | undefined>;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = new Stripe(key);
  return g[GLOBAL_KEY] as Stripe;
}
