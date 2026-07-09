"use client";

import { clockTime, eventLabel } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { container, item } from "@/motion";
import type { AnalyticsEvent } from "@nutz/phillip";
import { m, useReducedMotion } from "motion/react";

// A short, human description of an event's payload, when it carries one.
function detail(e: AnalyticsEvent): string | null {
  const p = e.payload as Record<string, unknown>;
  switch (e.type) {
    case "section_view":
      return typeof p.section === "string" ? p.section : null;
    case "cta_hover":
      return typeof p.target === "string" ? `“${p.target}”` : null;
    case "ping_shown":
      return typeof p.reason === "string" ? `${p.reason} · score ${p.score}` : null;
    case "conversation_opened":
      return typeof p.trigger === "string" ? String(p.trigger) : null;
    case "intent_classified":
      return [p.intent, p.sentiment].filter(Boolean).join(" · ") || null;
    case "iteration_requested":
      return typeof p.round === "number" ? `round ${p.round}` : null;
    case "funnel":
      return p.from ? `${p.from} → ${p.to}` : String(p.to ?? "");
    case "escalated":
      return typeof p.email === "string" ? String(p.email) : null;
    default:
      return null;
  }
}

// A signal is "notable" (filled marker) when it's a conversation/funnel moment
// rather than an ambient page signal.
const NOTABLE = new Set([
  "ping_shown",
  "conversation_opened",
  "intent_classified",
  "iteration_requested",
  "iteration_ready",
  "escalated",
  "checkout_started",
  "paid",
  "funnel",
]);

export function EventTimeline({ events }: { events: AnalyticsEvent[] }) {
  const reduce = useReducedMotion() ?? false;
  const ordered = [...events].reverse();

  if (ordered.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity captured yet.</p>;
  }

  return (
    <m.ol
      className="flex max-h-96 flex-col overflow-y-auto pr-1"
      variants={container(reduce, 0.04)}
      initial="initial"
      animate="animate"
    >
      {ordered.map((e) => {
        const d = detail(e);
        const notable = NOTABLE.has(e.type);
        return (
          <m.li
            key={e.id}
            className="relative flex items-baseline gap-3 border-l pb-3 pl-4 last:pb-0"
            variants={item(reduce)}
          >
            <span
              aria-hidden
              className={cn(
                "absolute top-1 -left-[4.5px] size-2 rounded-full border bg-background",
                notable ? "border-primary bg-primary" : "border-muted-foreground/40",
              )}
            />
            <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
              <span className={cn("text-sm", notable && "font-medium")}>{eventLabel(e.type)}</span>
              {d ? <span className="truncate text-xs text-muted-foreground">{d}</span> : null}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {clockTime(e.ts)}
            </span>
          </m.li>
        );
      })}
    </m.ol>
  );
}
