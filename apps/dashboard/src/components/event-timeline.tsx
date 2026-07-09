"use client";

import { clockTime, eventLabel } from "@/lib/analytics";
import { NOTABLE_EVENTS, eventDetail } from "@/lib/trends";
import { cn } from "@/lib/utils";
import { container, item } from "@/motion";
import type { AnalyticsEvent } from "@nutz/phillip";
import { m, useReducedMotion } from "motion/react";

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
        const d = eventDetail(e);
        const notable = NOTABLE_EVENTS.has(e.type);
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
