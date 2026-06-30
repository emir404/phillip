import type { Conversation } from "../intent/types";
import type { Lead, LeadStage, Preview } from "./records";

// The single payload the embed fetches on mount. The embed is deliberately
// dumb: everything here comes from the backend so the offer, script, or
// Phillip himself can change without redeploying a single site.

export interface Persona {
  name: string;
  title: string;
  avatarUrl: string;
  avatarVideoUrl?: string;
  /** Optional override for the opening line; otherwise composed client-side. */
  greeting?: string;
}

export interface Offer {
  productId: string;
  priceId: string;
  amount: number;
  currency: string;
  includes: string[];
}

export interface EngagementWeights {
  activeTimePerSec: number;
  activeTimeCapSec: number;
  scrollDepthPerPct: number;
  pricingPerSec: number;
  pricingCapSec: number;
  sectionViewPts: number;
  sectionViewCap: number;
  returningVisitorPts: number;
  intentSignalPts: number;
  intentSignalCap: number;
}

export interface EngagementConfig {
  weights: EngagementWeights;
  /** Score at which Phillip opens. */
  threshold: number;
  /** Let them look first — no ping before this. */
  minDwellMs: number;
  /** Hard fallback so nobody is ever missed. */
  fallbackMs: number;
  exitIntentEnabled: boolean;
  pingOncePerSession: boolean;
}

export interface FeatureFlags {
  iteration: boolean;
  escalation: boolean;
  checkout: boolean;
  setup: boolean;
}

export interface BootConfig {
  previewId: string;
  apiBase: string;
  lead: Pick<Lead, "id" | "business" | "industry" | "stage">;
  preview: Pick<Preview, "id" | "url" | "version" | "status">;
  persona: Persona;
  offer: Offer;
  engagement: EngagementConfig;
  /** CSS custom property overrides applied to the widget root. */
  theme?: Record<string, string>;
  /** Only surfaced once the lead reaches the checkout phase. */
  stripePublishableKey?: string;
  features: FeatureFlags;
  session: { id: string; returning: boolean; startedAt: string };
  /** Resumed conversation for returning leads. */
  conversation?: Conversation;
}

// The funnel a lead moves through; each transition is an event.
// delivered -> opened -> engaged -> reacted -> iterating/escalated
//   -> checkout -> paid -> live
export type FunnelStage = LeadStage;
