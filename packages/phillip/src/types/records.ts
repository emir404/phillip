// The shared records every agent reads and writes (SPEC.md "The records").
// State carries the customer, not any single agent's memory.

export type LeadStage =
  | "delivered"
  | "opened"
  | "engaged"
  | "reacted"
  | "iterating"
  | "escalated"
  | "checkout"
  | "paid"
  | "live";

export interface Lead {
  id: string;
  business: string;
  contact?: string;
  industry?: string;
  email?: string;
  source: string;
  stage: LeadStage;
}

export type PreviewStatus = "draft" | "live" | "superseded";

export interface Preview {
  id: string;
  leadId: string;
  url: string;
  version: number;
  status: PreviewStatus;
}

export interface DeviceContext {
  type: "mobile" | "tablet" | "desktop";
  os: string;
  browser: string;
  viewport: { width: number; height: number };
}

export interface GeoContext {
  country?: string;
  region?: string;
  city?: string;
}

export interface Session {
  id: string;
  previewId: string;
  device: DeviceContext;
  geo?: GeoContext;
  referrer?: string;
  startedAt: string;
  lastSeen: string;
  returning: boolean;
}

export type OrderStatus = "pending" | "paid" | "failed" | "refunded";

export interface Order {
  id: string;
  leadId: string;
  stripeId?: string;
  amount: number;
  currency: string;
  status: OrderStatus;
}

export interface Account {
  id: string;
  customer: string;
  domain?: string;
  siteId: string;
  login?: string;
}

// --- Iteration (Phase 04) ---

export type ChangeKind =
  | "copy"
  | "headline"
  | "palette"
  | "font"
  | "photo_swap"
  | "photo_remove"
  | "section_toggle"
  | "section_reorder"
  | "hours"
  | "contact"
  | "layout";

export interface ChangeItem {
  kind: ChangeKind;
  /** What the change targets, e.g. a section id or element label. */
  target?: string;
  /** The new value, when the change carries one (copy text, hex, url). */
  value?: string;
  note?: string;
}

/** An element the lead pointed at in the preview (takeover picker). The
 *  selector favors the generator's stable data-* hooks so the Build agent can
 *  grep it straight out of the site files. */
export interface ElementTarget {
  selector: string;
  tag: string;
  /** Visible text of the picked element, when it's a leaf (≤60 chars). */
  text?: string;
  /** Nearest data-section value, when the element sits inside one. */
  section?: string;
}

export interface ChangeSet {
  items: ChangeItem[];
  freeText?: string;
  /** Set when the lead picked a specific element to scope the ask to. */
  target?: ElementTarget;
}

/** `queued_manual` = a human took the build over; the widget stops waiting. */
export type IterationStatus = "queued" | "queued_manual" | "processing" | "done" | "failed";

export interface IterationRequest {
  id: string;
  previewId: string;
  changeSet: ChangeSet;
  round: number;
  status: IterationStatus;
  resultUrl?: string;
  version?: number;
}
