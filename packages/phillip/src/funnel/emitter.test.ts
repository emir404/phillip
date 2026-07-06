import { describe, expect, it } from "vitest";
import type { Tracker } from "../analytics";
import type { LeadStage } from "../types/records";
import { FunnelEmitter } from "./emitter";

interface FunnelEvent {
  from: LeadStage | null;
  to: LeadStage;
  reason?: string;
}

function makeFunnel(initial: LeadStage) {
  const events: FunnelEvent[] = [];
  const tracker = {
    track: (_type: string, payload: FunnelEvent) => events.push(payload),
  } as unknown as Tracker;
  return { funnel: new FunnelEmitter(tracker, initial), events };
}

describe("FunnelEmitter", () => {
  it("emits one event per forward transition", () => {
    const { funnel, events } = makeFunnel("opened");
    funnel.to("engaged");
    funnel.to("reacted");
    expect(events).toEqual([
      { from: "opened", to: "engaged", reason: undefined },
      { from: "engaged", to: "reacted", reason: undefined },
    ]);
    expect(funnel.stage).toBe("reacted");
  });

  it("ignores repeat and backward transitions", () => {
    const { funnel, events } = makeFunnel("engaged");
    funnel.to("engaged"); // same
    funnel.to("opened"); // backward
    expect(events).toHaveLength(0);
    expect(funnel.stage).toBe("engaged");
  });

  it("allows switching between the iterating/escalated branches", () => {
    const { funnel, events } = makeFunnel("reacted");
    funnel.to("iterating");
    funnel.to("escalated");
    expect(events.map((e) => e.to)).toEqual(["iterating", "escalated"]);
  });

  it("carries a reason through to the event", () => {
    const { funnel, events } = makeFunnel("reacted");
    funnel.to("iterating", "iterate");
    expect(events[0]?.reason).toBe("iterate");
  });
});
