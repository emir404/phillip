import type { EngagementConfig } from "../types/boot";
import type { PingReason } from "../types/events";

// What the engine looks at to decide the moment. Pure data — the DOM-watching
// tracker produces this each tick and feeds it in.
export interface TriggerSnapshot {
  score: number;
  dwellMs: number;
  exitIntent: boolean;
  alreadyPinged: boolean;
}

export interface TriggerDecision {
  shouldPing: boolean;
  reason: PingReason | null;
}

const NO: TriggerDecision = { shouldPing: false, reason: null };

/**
 * Decide whether Phillip should open now. Priority: respect the min-dwell guard
 * (let them look first) and ping-once, then exit-intent (catch them leaving even
 * below threshold), then the engagement threshold, then the hard fallback timer
 * so no lead is ever missed.
 */
export function decide(snap: TriggerSnapshot, cfg: EngagementConfig): TriggerDecision {
  if (cfg.pingOncePerSession && snap.alreadyPinged) return NO;
  if (snap.dwellMs < cfg.minDwellMs) return NO;

  if (cfg.exitIntentEnabled && snap.exitIntent) {
    return { shouldPing: true, reason: "exit_intent" };
  }
  if (snap.score >= cfg.threshold) {
    return { shouldPing: true, reason: "score" };
  }
  if (snap.dwellMs >= cfg.fallbackMs) {
    return { shouldPing: true, reason: "fallback" };
  }
  return NO;
}
