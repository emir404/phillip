import type { IterationRowStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<IterationRowStatus, string> = {
  queued: "border-transparent bg-secondary text-muted-foreground",
  processing: "border-transparent bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-start",
  done: "border-transparent bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  failed: "border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20",
  queued_manual:
    "border-transparent bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
};

const STATUS_LABEL: Record<IterationRowStatus, string> = {
  queued: "Queued",
  processing: "Processing",
  done: "Done",
  failed: "Failed",
  queued_manual: "Needs you",
};

// Why an iteration needs a human, in plain words.
const ERROR_LABEL: Record<string, string> = {
  no_changes: "the edit produced no change",
  deploy_not_created: "pushed, but Vercel never built it — is the repo connected?",
  build_timeout: "the build ran too long",
  build_error: "the build failed",
  build_canceled: "the build was cancelled",
  executor_lost: "the run was cut short — retry it",
};

export function statusReasonLabel(reason: string | null | undefined): string | null {
  if (!reason) return null;
  if (reason === "no_source") return "needs site source";
  if (reason === "budget") return "budget cap reached";
  if (reason === "no_api_key") return "LLM key missing";
  if (reason === "no_github_token") return "GitHub token missing";
  if (reason === "no_vercel_project") return "pushed — no Vercel project linked";
  if (reason === "deploy_skipped") return "deploy skipped";
  if (reason === "handled_manually") return "handled manually";
  if (reason.startsWith("error:")) {
    const detail = reason.slice("error:".length).trim();
    const known = ERROR_LABEL[detail];
    if (known) return known;
    return `error: ${detail.length > 60 ? `${detail.slice(0, 60)}…` : detail}`;
  }
  return reason;
}

export function IterationStatusBadge({ status }: { status: IterationRowStatus }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center whitespace-nowrap rounded-full border px-2 text-xs font-medium",
        STATUS_CLASS[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
