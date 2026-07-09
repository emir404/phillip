// Stripe sends the customer back to their own site with `?phillip=…`. The tag
// tells us how checkout ended before our webhook has necessarily landed, and
// it must never be left in the URL for the lead to see or share.

export type StripeReturn = "paid" | "cancelled" | null;

const PARAM = "phillip";

/**
 * Read the checkout outcome off the URL and scrub the parameter, leaving every
 * other query param and the hash exactly as they were. Safe on the server and
 * in browsers without history.replaceState.
 */
export function readAndStripStripeReturn(): StripeReturn {
  if (typeof window === "undefined" || !window.location) return null;

  let url: URL;
  try {
    url = new URL(window.location.href);
  } catch {
    return null;
  }
  const value = url.searchParams.get(PARAM);
  if (value !== "paid" && value !== "checkout_cancelled") return null;

  url.searchParams.delete(PARAM);
  try {
    const search = url.searchParams.toString();
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${search ? `?${search}` : ""}${url.hash}`,
    );
  } catch {
    // A stripped param is a nicety; the outcome below is the point.
  }

  return value === "paid" ? "paid" : "cancelled";
}
