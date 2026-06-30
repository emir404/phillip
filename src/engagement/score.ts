import type { EngagementWeights } from "../types/boot";

// The signals snapshot the score is computed from. Produced by the analytics
// layer; consumed here as plain data so the math stays pure and unit-testable.
export interface EngagementSignals {
  /** Seconds of *active* time (idle/hidden time is excluded upstream). */
  activeTimeSec: number;
  scrollDepthPct: number; // 0..100
  timeOnPricingSec: number;
  /** Count of distinct high-value sections viewed. */
  sectionsViewed: number;
  returningVisitor: boolean;
  ctaHovers: number;
  galleryOpens: number;
  contactInteractions: number;
  /** Whether the lead is idle right now (informational for the trigger). */
  idleNow: boolean;
}

export const ZERO_SIGNALS: EngagementSignals = {
  activeTimeSec: 0,
  scrollDepthPct: 0,
  timeOnPricingSec: 0,
  sectionsViewed: 0,
  returningVisitor: false,
  ctaHovers: 0,
  galleryOpens: 0,
  contactInteractions: 0,
  idleNow: false,
};

/**
 * Weighted engagement score, ~0..100. Each contribution is individually capped
 * so no single signal can run away with the score.
 */
export function computeScore(s: EngagementSignals, w: EngagementWeights): number {
  const active = Math.min(s.activeTimeSec, w.activeTimeCapSec) * w.activeTimePerSec;
  const scroll = Math.min(Math.max(s.scrollDepthPct, 0), 100) * w.scrollDepthPerPct;
  const pricing = Math.min(s.timeOnPricingSec, w.pricingCapSec) * w.pricingPerSec;
  const sections = Math.min(s.sectionsViewed * w.sectionViewPts, w.sectionViewCap);
  const returning = s.returningVisitor ? w.returningVisitorPts : 0;
  const intentRaw = (s.ctaHovers + s.galleryOpens + s.contactInteractions) * w.intentSignalPts;
  const intent = Math.min(intentRaw, w.intentSignalCap);

  return Math.round(active + scroll + pricing + sections + returning + intent);
}
