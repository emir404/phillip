import { m, useReducedMotion } from "motion/react";
import { kpis, money } from "../lib/analytics";
import type { DashboardLead } from "../lib/types";
import { container, item } from "../motion";

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
      className="kpis"
      variants={container(reduce)}
      initial="initial"
      animate="animate"
      aria-label="key metrics"
    >
      {cards.map((c) => (
        <m.div key={c.label} className="kpi card" variants={item(reduce)}>
          <span className="kpi-label">{c.label}</span>
          <span className="kpi-value tnum">{c.value}</span>
          <span className="kpi-sub">{c.sub}</span>
        </m.div>
      ))}
    </m.section>
  );
}
