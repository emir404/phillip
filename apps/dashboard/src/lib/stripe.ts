import Stripe from "stripe";

// Lazy per-mode singletons so builds/dev without a key still boot; routes that
// need Stripe fail with a clear message instead of at import time.
//
// "live" is the default; "test" serves test-mode leads (purchase rehearsals on
// Stripe's test keys — the dashboard toggle flips a lead between the two).
export type StripeMode = "live" | "test";

const GLOBAL_KEY = "__phillip_stripe__";

export function stripe(mode: StripeMode = "live"): Stripe {
  const key = mode === "test" ? process.env.STRIPE_TEST_SECRET_KEY : process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      mode === "test"
        ? "STRIPE_TEST_SECRET_KEY is not configured"
        : "STRIPE_SECRET_KEY is not configured",
    );
  }
  const g = globalThis as unknown as Record<
    string,
    Partial<Record<StripeMode, Stripe>> | undefined
  >;
  const cache = g[GLOBAL_KEY] ?? {};
  g[GLOBAL_KEY] = cache;
  const cached = cache[mode];
  if (cached) return cached;
  const instance = new Stripe(key);
  cache[mode] = instance;
  return instance;
}
