import type { LeadStage } from "../types/records";

export type FunnelStage = LeadStage;

// delivered -> opened -> engaged -> reacted -> iterating/escalated
//   -> checkout -> paid -> live. iterating and escalated share a tier (two
// branches off "reacted").
export const FUNNEL_ORDER: Record<LeadStage, number> = {
  delivered: 0,
  opened: 1,
  engaged: 2,
  reacted: 3,
  iterating: 4,
  escalated: 4,
  checkout: 5,
  paid: 6,
  live: 7,
};

/** A transition counts if it moves to a different, non-earlier stage. */
export function isForward(from: LeadStage, to: LeadStage): boolean {
  return to !== from && FUNNEL_ORDER[to] >= FUNNEL_ORDER[from];
}
