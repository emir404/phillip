import { describe, expect, it } from "vitest";
import type { EngagementConfig } from "../types/boot";
import { type TriggerSnapshot, decide } from "./triggerEngine";
import { DEFAULT_ENGAGEMENT } from "./weights";

const cfg: EngagementConfig = DEFAULT_ENGAGEMENT;
const snap = (over: Partial<TriggerSnapshot>): TriggerSnapshot => ({
  score: 0,
  dwellMs: 10_000,
  exitIntent: false,
  alreadyPinged: false,
  ...over,
});

describe("decide", () => {
  it("never pings before the min-dwell guard, even at a high score", () => {
    const d = decide(snap({ score: 999, dwellMs: cfg.minDwellMs - 1 }), cfg);
    expect(d.shouldPing).toBe(false);
  });

  it("pings on score once past the threshold", () => {
    const d = decide(snap({ score: cfg.threshold }), cfg);
    expect(d).toEqual({ shouldPing: true, reason: "score" });
  });

  it("pings on exit-intent past min-dwell even below threshold", () => {
    const d = decide(snap({ score: 0, exitIntent: true }), cfg);
    expect(d).toEqual({ shouldPing: true, reason: "exit_intent" });
  });

  it("prioritizes exit-intent over score", () => {
    const d = decide(snap({ score: 999, exitIntent: true }), cfg);
    expect(d.reason).toBe("exit_intent");
  });

  it("pings via the fallback timer when nothing else fired", () => {
    const d = decide(snap({ score: 0, dwellMs: cfg.fallbackMs }), cfg);
    expect(d).toEqual({ shouldPing: true, reason: "fallback" });
  });

  it("respects ping-once-per-session", () => {
    const d = decide(snap({ score: 999, alreadyPinged: true }), cfg);
    expect(d.shouldPing).toBe(false);
  });

  it("ignores exit-intent when disabled in config", () => {
    const d = decide(snap({ exitIntent: true }), { ...cfg, exitIntentEnabled: false });
    expect(d.shouldPing).toBe(false);
  });
});
