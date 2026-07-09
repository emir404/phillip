"use client";

import { Card } from "@/components/ui/card";
import { kpis, money } from "@/lib/analytics";
import type { DashboardLead } from "@/lib/types";
import { container, item } from "@/motion";
import { m, useReducedMotion } from "motion/react";

export function KpiCards({ leads }: { leads: DashboardLead[] }) {
  const reduce = useReducedMotion() ?? false;
  const k = kpis(leads);

  const cards = [
    { label: "Leads", value: String(k.leads), sub: "on live previews" },
    { label: "Engaged", value: `${k.engagedPct}%`, sub: `${k.engaged} opened the chat` },
    { label: "Paid", value: String(k.paid), sub: `${k.paidPct}% of leads` },
    { label: "Revenue", value: money(k.revenue), sub: "collected · monthly" },
    { label: "Avg. score", value: String(k.avgScore), sub: "engagement, 0–100" },
  ];

  return (
    <m.section
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5"
      variants={container(reduce)}
      initial="initial"
      animate="animate"
      aria-label="Key metrics"
    >
      {cards.map((c) => (
        <m.div key={c.label} variants={item(reduce)}>
          <Card size="sm" className="h-full gap-1 shadow-none">
            <div className="px-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {c.label}
              </p>
              <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">{c.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{c.sub}</p>
            </div>
          </Card>
        </m.div>
      ))}
    </m.section>
  );
}
