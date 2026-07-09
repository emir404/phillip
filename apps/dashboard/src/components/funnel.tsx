"use client";

import { STAGE_BAR } from "@/components/stage-badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { funnel } from "@/lib/analytics";
import type { DashboardLead } from "@/lib/types";
import { cn } from "@/lib/utils";
import { container, item } from "@/motion";
import { m, useReducedMotion } from "motion/react";

// Thick stage bars with the label and counts overlaid on the track (the
// chart-card21 treatment): the fill width is share-of-top, the right-hand
// percentage is conversion from the previous rung.
export function Funnel({ leads, className }: { leads: DashboardLead[]; className?: string }) {
  const reduce = useReducedMotion() ?? false;
  const rungs = funnel(leads);
  const top = rungs[0]?.count || 1;

  return (
    <Card className={cn("h-full", className)} aria-label="Conversion funnel">
      <CardHeader>
        <CardTitle>Funnel</CardTitle>
        <CardDescription>delivered → paid → live</CardDescription>
      </CardHeader>
      <m.div
        className="flex flex-col gap-2 px-4 pb-1"
        variants={container(reduce, 0.07)}
        initial="initial"
        animate="animate"
      >
        {rungs.map((r, i) => {
          const width = `${(r.count / top) * 100}%`;
          return (
            <m.div key={r.stage} variants={item(reduce)}>
              <div className="relative h-8 overflow-hidden rounded-lg bg-muted/50">
                <m.div
                  className={cn("absolute inset-y-0 left-0 rounded-lg", STAGE_BAR[r.stage])}
                  initial={{ width: reduce ? width : "0%" }}
                  animate={{ width }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay: 0.15 }
                  }
                />
                <div className="absolute inset-0 flex items-center justify-between px-3">
                  <span className="text-sm font-medium">{r.label}</span>
                  <span className="flex items-baseline gap-2 tabular-nums">
                    <span className="text-sm font-semibold">{r.count}</span>
                    {/* Conversion from the previous rung; meaningless on the top rung. */}
                    {i > 0 ? (
                      <span className="w-9 text-right text-xs text-muted-foreground">
                        {r.pctOfPrev}%
                      </span>
                    ) : (
                      <span className="w-9" aria-hidden />
                    )}
                  </span>
                </div>
              </div>
            </m.div>
          );
        })}
      </m.div>
    </Card>
  );
}
