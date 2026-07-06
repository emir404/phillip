import type { LeadStage } from "@nutz/phillip";
import { STAGE_LABEL } from "../lib/analytics";

// Shades of the one signature blue track how far along a lead is — darker and
// bolder the further into the pipeline. Danger is the only color exception.
export const STAGE_TONE: Record<LeadStage, string> = {
  delivered: "b1",
  opened: "b1",
  engaged: "b2",
  reacted: "b3",
  iterating: "b3",
  escalated: "danger",
  checkout: "b4",
  paid: "b5",
  live: "b6",
};

export function StageBadge({ stage }: { stage: LeadStage }) {
  return (
    <span className={`badge tone-${STAGE_TONE[stage]}`}>
      <span className="badge-dot" />
      {STAGE_LABEL[stage]}
    </span>
  );
}
