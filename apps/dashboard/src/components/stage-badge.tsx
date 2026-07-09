import { STAGE_LABEL } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { LeadStage } from "@nutz/phillip";

// One accent family per funnel stage so a stage reads the same everywhere
// (badge, funnel bar, table). Classes are written out in full for Tailwind's
// static extraction, with deliberate light + dark variants.
const BADGE_TONE: Record<LeadStage, string> = {
  delivered:
    "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-400/10 dark:text-slate-300 dark:border-slate-400/20",
  opened:
    "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-400/10 dark:text-slate-200 dark:border-slate-400/25",
  engaged:
    "bg-brand/10 text-brand border-brand/25 dark:bg-brand/15 dark:text-brand-start dark:border-brand/30",
  reacted:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-400/10 dark:text-violet-300 dark:border-violet-400/25",
  iterating:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/25",
  escalated:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-400/10 dark:text-rose-300 dark:border-rose-400/25",
  checkout:
    "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-400/10 dark:text-teal-300 dark:border-teal-400/25",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/25",
  live: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-400/15 dark:text-emerald-200 dark:border-emerald-400/30",
};

const DOT_TONE: Record<LeadStage, string> = {
  delivered: "bg-slate-400 dark:bg-slate-500",
  opened: "bg-slate-500 dark:bg-slate-400",
  engaged: "bg-brand dark:bg-brand-start",
  reacted: "bg-violet-500 dark:bg-violet-400",
  iterating: "bg-amber-500 dark:bg-amber-400",
  escalated: "bg-rose-500 dark:bg-rose-400",
  checkout: "bg-teal-500 dark:bg-teal-400",
  paid: "bg-emerald-500 dark:bg-emerald-400",
  live: "bg-emerald-600 dark:bg-emerald-300",
};

// The funnel bars reuse the same per-stage accent.
export const STAGE_BAR: Record<LeadStage, string> = {
  delivered: "bg-slate-400/70 dark:bg-slate-500/70",
  opened: "bg-slate-500/80 dark:bg-slate-400/70",
  engaged: "bg-brand/80 dark:bg-brand-start/70",
  reacted: "bg-violet-500/80 dark:bg-violet-400/70",
  iterating: "bg-amber-500/80 dark:bg-amber-400/70",
  escalated: "bg-rose-500/80 dark:bg-rose-400/70",
  checkout: "bg-teal-500/80 dark:bg-teal-400/70",
  paid: "bg-emerald-500/80 dark:bg-emerald-400/70",
  live: "bg-emerald-600/80 dark:bg-emerald-300/70",
};

export function StageBadge({ stage, className }: { stage: LeadStage; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-xs font-medium",
        BADGE_TONE[stage],
        className,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", DOT_TONE[stage])} />
      {STAGE_LABEL[stage]}
    </span>
  );
}
