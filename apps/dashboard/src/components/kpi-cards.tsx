"use client";

import { Card } from "@/components/ui/card";
import { kpis, money } from "@/lib/analytics";
import { leadsSpark, revenueSpark } from "@/lib/trends";
import type { DashboardLead } from "@/lib/types";
import { container, item } from "@/motion";
import type { Icon } from "@phosphor-icons/react";
import {
  ChatCircleDots,
  CheckCircle,
  CurrencyCircleDollar,
  Gauge,
  UsersThree,
} from "@phosphor-icons/react";
import { m, useReducedMotion } from "motion/react";
import { Area, AreaChart } from "recharts";

// A quiet cumulative sparkline in the card corner — no axes, no tooltip, just
// the shape of the trend in the brand color.
function Sparkline({ id, points }: { id: string; points: number[] }) {
  if (points.length < 2) return null;
  const data = points.map((v) => ({ v }));
  const gradientId = `spark-${id}`;
  return (
    <div className="pointer-events-none absolute right-0 bottom-0 h-9 w-20 opacity-80" aria-hidden>
      <AreaChart
        width={80}
        height={36}
        data={data}
        margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          dataKey="v"
          type="monotone"
          stroke="var(--chart-1)"
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </div>
  );
}

export function KpiCards({ leads }: { leads: DashboardLead[] }) {
  const reduce = useReducedMotion() ?? false;
  const k = kpis(leads);

  const cards: Array<{
    label: string;
    value: string;
    sub: string;
    icon: Icon;
    spark?: number[];
  }> = [
    {
      label: "Leads",
      value: String(k.leads),
      sub: "on live previews",
      icon: UsersThree,
      spark: leadsSpark(leads),
    },
    {
      label: "Engaged",
      value: `${k.engagedPct}%`,
      sub: `${k.engaged} opened the chat`,
      icon: ChatCircleDots,
    },
    { label: "Paid", value: String(k.paid), sub: `${k.paidPct}% of leads`, icon: CheckCircle },
    {
      label: "Revenue",
      value: money(k.revenue),
      sub: "collected · monthly",
      icon: CurrencyCircleDollar,
      spark: revenueSpark(leads),
    },
    { label: "Avg. score", value: String(k.avgScore), sub: "engagement, 0–100", icon: Gauge },
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
          <Card size="sm" className="relative h-full gap-1 overflow-hidden">
            <div className="px-3">
              <p className="flex items-center justify-between text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {c.label}
                <span className="text-muted-foreground/60 [&_svg]:size-4" aria-hidden>
                  <c.icon />
                </span>
              </p>
              <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">{c.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{c.sub}</p>
            </div>
            {c.spark && !reduce ? <Sparkline id={c.label.toLowerCase()} points={c.spark} /> : null}
          </Card>
        </m.div>
      ))}
    </m.section>
  );
}
