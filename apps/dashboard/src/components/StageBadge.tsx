import type { LeadStage } from "@nutz/phillip";
import { STAGE_LABEL } from "../lib/analytics";

// A stage tone maps each funnel stage to a color family used by the badge and
// the funnel bars, so the same stage reads the same everywhere.
export const STAGE_TONE: Record<LeadStage, string> = {
  delivered: "slate",
  opened: "slate",
  engaged: "blue",
  reacted: "violet",
  iterating: "amber",
  escalated: "rose",
  checkout: "teal",
  paid: "green",
  live: "green",
};

export function StageBadge({ stage }: { stage: LeadStage }) {
  return (
    <span className={`badge tone-${STAGE_TONE[stage]}`}>
      <span className="badge-dot" />
      {STAGE_LABEL[stage]}
    </span>
  );
}
