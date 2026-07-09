import type { OrderStatus } from "@nutz/phillip";
import { deleteVercelProject } from "./executor";
import { type LeadRow, deleteLead } from "./store";

// Deleting a lead is the one irreversible thing the dashboard does, and it has
// two callers (the server action behind the button, the authed DELETE route).
// The rules live here once so the two can never drift apart again.

/** Why a lead may not be deleted, or null when it may. */
export function deleteBlockedReason(lead: LeadRow): string | null {
  // A rehearsal lead is always disposable, even once it has "paid".
  if ((lead.stage === "paid" || lead.stage === "live") && !lead.testMode) {
    return "This lead has paid — real customers can't be deleted.";
  }
  return null;
}

/**
 * Why a lead's price may not be edited, or null when it may.
 *
 * Once the money lands the quote is history — Stripe bills the subscription it
 * already has, so a new number here would describe a charge that never
 * happened. A rehearsal lead is no exception: its "paid" stage silences the
 * widget, so there is nothing left to re-quote.
 */
export function pricingLockedReason(lead: LeadRow, orderStatus?: OrderStatus): string | null {
  if (orderStatus === "paid" || lead.stage === "paid" || lead.stage === "live") {
    return "This lead has paid — its price is locked.";
  }
  return null;
}

/**
 * Erase the lead and take down the preview we deployed for it.
 *
 * A repo-backed lead's Vercel project belongs to the customer: it is wired to
 * their repository and serves their real site. We never created it, and we must
 * never delete it — only the throwaway projects the executor deployed itself.
 */
export async function purgeLead(lead: LeadRow): Promise<void> {
  if (lead.vercelProjectId && !lead.repoUrl) {
    await deleteVercelProject(lead.vercelProjectId).catch(() => false);
  }
  await deleteLead(lead.id);
}
