import type { Tracker } from "../analytics";
import type { LeadStage } from "../types/records";
import { isForward } from "./stages";

// Tracks the lead's funnel stage and emits one event per forward transition.
// Backward / repeat transitions are ignored so the funnel only ratchets up.
export class FunnelEmitter {
  private current: LeadStage;

  constructor(
    private readonly tracker: Tracker,
    initial: LeadStage,
  ) {
    this.current = initial;
  }

  to(stage: LeadStage, reason?: string): void {
    if (!isForward(this.current, stage)) return;
    const from = this.current;
    this.current = stage;
    this.tracker.track("funnel", { from, to: stage, reason });
  }

  get stage(): LeadStage {
    return this.current;
  }
}
