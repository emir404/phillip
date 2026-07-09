// Vendored from AI SDK Elements' Task, reshaped for Phillip's build status:
// one presentational block per iteration, phase-driven copy in Phillip's
// voice. The optional `summary` (the visitor's requested change) renders as a
// muted second line.
import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { Check } from "../ui/icons";
import { Loader } from "./loader";

export type TaskPhase = "submitting" | "working" | "done" | "failed" | "manual";

const PHASE_COPY: Record<TaskPhase, string> = {
  submitting: "sending it over…",
  working: "rebuilding your site…",
  done: "live — take a look",
  failed: "hmm, that one didn't take. try again?",
  manual: "my colleague is picking this one up — you'll get an email shortly.",
};

export interface TaskProps extends HTMLAttributes<HTMLDivElement> {
  phase: TaskPhase;
  /** The requested change, echoed under the status line. */
  summary?: string;
}

export function Task({ phase, summary, className, ...props }: TaskProps) {
  const busy = phase === "submitting" || phase === "working";
  return (
    <div
      data-phase={phase}
      className={cn(
        "flex items-center gap-2.5 rounded-lg border border-white/5 bg-ink-850/60 px-3 py-2.5 text-[13px] text-white/80",
        phase === "failed" && "text-red-300/90",
        className,
      )}
      {...props}
    >
      {busy ? <Loader /> : null}
      {phase === "done" ? <Check size={14} className="shrink-0" /> : null}
      <div className="flex min-w-0 flex-col">
        <span>{PHASE_COPY[phase]}</span>
        {summary ? <span className="truncate text-[12px] text-white/50">{summary}</span> : null}
      </div>
    </div>
  );
}
