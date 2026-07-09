"use client";

import { STAGE_BAR } from "@/components/stage-badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { funnel } from "@/lib/analytics";
import type { DashboardLead } from "@/lib/types";
import { cn } from "@/lib/utils";
import { container, item } from "@/motion";
import { m, useReducedMotion } from "motion/react";

export function Funnel({ leads }: { leads: DashboardLead[] }) {
  const reduce = useReducedMotion() ?? false;
  const rungs = funnel(leads);
  const top = rungs[0]?.count || 1;

  return (
    <Card className="shadow-none" aria-label="Conversion funnel">
      <CardHeader>
        <CardTitle>Funnel</CardTitle>
        <CardDescription>delivered → paid → live</CardDescription>
      </CardHeader>
      <m.div
        className="flex flex-col gap-3 px-4 pb-1"
        variants={container(reduce, 0.07)}
        initial="initial"
        animate="animate"
      >
        {rungs.map((r) => (
          <m.div key={r.stage} variants={item(reduce)}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-medium">{r.label}</span>
              <span className="flex items-baseline gap-2 tabular-nums">
                <span className="font-semibold">{r.count}</span>
                <span className="w-9 text-right text-xs text-muted-foreground">{r.pctOfPrev}%</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <m.div
                className={cn("h-full rounded-full", STAGE_BAR[r.stage])}
                initial={{ width: reduce ? `${(r.count / top) * 100}%` : "0%" }}
                animate={{ width: `${(r.count / top) * 100}%` }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay: 0.15 }
                }
              />
            </div>
          </m.div>
        ))}
      </m.div>
    </Card>
  );
}
