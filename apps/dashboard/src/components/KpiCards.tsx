import { m, useReducedMotion } from "motion/react";
import type { DashboardLead } from "../data/sample";
import { kpis, money } from "../lib/analytics";
import { container, item } from "../motion";
import { IconCheckBadge, IconCoin, IconGauge, IconPulse, IconUserPlus } from "./icons";

export function KpiCards({ leads }: { leads: DashboardLead[] }) {
  const reduce = useReducedMotion() ?? false;
  const k = kpis(leads);

  const cards = [
    {
      label: "Leads",
      value: String(k.leads),
      sub: "on live previews",
      icon: IconUserPlus,
      tone: "b2",
    },
    {
      label: "Engaged",
      value: `${k.engagedPct}%`,
      sub: `${k.engaged} opened the chat`,
      icon: IconPulse,
      tone: "b3",
    },
    {
      label: "Paid",
      value: String(k.paid),
      sub: `${k.paidPct}% of leads`,
      icon: IconCheckBadge,
      tone: "b5",
    },
    {
      label: "Revenue",
      value: money(k.revenue),
      sub: "collected · monthly",
      icon: IconCoin,
      tone: "b6",
    },
    {
      label: "Avg. score",
      value: String(k.avgScore),
      sub: "engagement, 0–100",
      icon: IconGauge,
      tone: "b1",
    },
  ];

  return (
    <m.section
      className="kpis"
      variants={container(reduce)}
      initial="initial"
      animate="animate"
      aria-label="key metrics"
    >
      {cards.map((c) => (
        <m.div key={c.label} className="kpi card" variants={item(reduce)}>
          <span className={`kpi-icon tone-${c.tone}`}>
            <c.icon size={17} />
          </span>
          <span className="kpi-label">{c.label}</span>
          <span className="kpi-value tnum">{c.value}</span>
          <span className="kpi-sub">{c.sub}</span>
        </m.div>
      ))}
    </m.section>
  );
}
