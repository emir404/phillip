import { describe, expect, it } from "vitest";
import { type EngagementSignals, ZERO_SIGNALS, computeScore } from "./score";
import { DEFAULT_WEIGHTS } from "./weights";

const W = DEFAULT_WEIGHTS;
const sig = (over: Partial<EngagementSignals>): EngagementSignals => ({ ...ZERO_SIGNALS, ...over });

describe("computeScore", () => {
  it("is zero for no engagement", () => {
    expect(computeScore(ZERO_SIGNALS, W)).toBe(0);
  });

  it("caps active time at the configured ceiling", () => {
    const capped = computeScore(sig({ activeTimeSec: 10_000 }), W);
    expect(capped).toBe(W.activeTimeCapSec * W.activeTimePerSec); // 30
  });

  it("caps time-on-pricing (high-intent) contribution", () => {
    expect(computeScore(sig({ timeOnPricingSec: 9_999 }), W)).toBe(
      W.pricingCapSec * W.pricingPerSec,
    ); // 20
  });

  it("caps distinct section views", () => {
    expect(computeScore(sig({ sectionsViewed: 100 }), W)).toBe(W.sectionViewCap); // 15
  });

  it("caps the combined intent signals", () => {
    const s = sig({ ctaHovers: 5, galleryOpens: 5, contactInteractions: 5 });
    expect(computeScore(s, W)).toBe(W.intentSignalCap); // 15
  });

  it("adds a flat bonus for returning visitors", () => {
    expect(computeScore(sig({ returningVisitor: true }), W)).toBe(W.returningVisitorPts); // 15
  });

  it("clamps scroll depth to 0..100", () => {
    expect(computeScore(sig({ scrollDepthPct: 250 }), W)).toBe(
      Math.round(100 * W.scrollDepthPerPct),
    ); // 20
    expect(computeScore(sig({ scrollDepthPct: -50 }), W)).toBe(0);
  });

  it("crosses the default threshold for a genuinely interested lead", () => {
    const interested = sig({
      activeTimeSec: 40,
      scrollDepthPct: 80,
      timeOnPricingSec: 12,
      sectionsViewed: 3,
      ctaHovers: 1,
    });
    expect(computeScore(interested, W)).toBeGreaterThanOrEqual(50);
  });

  it("does not cross the threshold for a quick bouncer", () => {
    const bouncer = sig({ activeTimeSec: 4, scrollDepthPct: 10 });
    expect(computeScore(bouncer, W)).toBeLessThan(50);
  });
});
