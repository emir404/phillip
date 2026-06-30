import type { EngagementConfig, EngagementWeights } from "../types/boot";

// Default engagement weights, normalized so a genuinely interested lead lands
// around the threshold. The backend can override any of these per-preview at
// boot (BootConfig.engagement) so the team tunes without redeploying sites.
export const DEFAULT_WEIGHTS: EngagementWeights = {
  activeTimePerSec: 0.5, // up to 30 pts over 60s of *active* time
  activeTimeCapSec: 60,
  scrollDepthPerPct: 0.2, // up to 20 pts at 100% scrolled
  pricingPerSec: 1.0, // up to 20 pts — time on pricing is high intent
  pricingCapSec: 20,
  sectionViewPts: 5, // 5 pts per distinct section, capped
  sectionViewCap: 15,
  returningVisitorPts: 15, // they came back
  intentSignalPts: 5, // CTA hover / gallery open / contact tap
  intentSignalCap: 15,
};

export const DEFAULT_ENGAGEMENT: EngagementConfig = {
  weights: DEFAULT_WEIGHTS,
  threshold: 50,
  minDwellMs: 5_000, // let them look first (matches the soft pulse)
  fallbackMs: 45_000, // hard cap so nobody is ever missed
  exitIntentEnabled: true,
  pingOncePerSession: true,
};
