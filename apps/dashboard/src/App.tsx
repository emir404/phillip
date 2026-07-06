import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Funnel } from "./components/Funnel";
import { KpiCards } from "./components/KpiCards";
import { LeadDetail } from "./components/LeadDetail";
import { LeadsTable } from "./components/LeadsTable";
import { type DashboardLead, leads } from "./data/sample";
import { container, item } from "./motion";

export default function App() {
  const reduce = useReducedMotion() ?? false;
  const [selected, setSelected] = useState<DashboardLead | null>(null);

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="app">
        <m.header
          className="topbar"
          variants={container(reduce)}
          initial="initial"
          animate="animate"
        >
          <m.div className="brand" variants={item(reduce)}>
            <span className="brand-mark">nutz</span>
            <span className="brand-sep">/</span>
            <span className="brand-name">Phillip analytics</span>
          </m.div>
          <m.div className="topbar-right" variants={item(reduce)}>
            <span className="live-pill">
              <span className="live-dot" />
              live
            </span>
            <span className="topbar-sub">every lead, end to end</span>
          </m.div>
        </m.header>

        <main className="content">
          <KpiCards leads={leads} />
          <div className="grid">
            <Funnel leads={leads} />
            <LeadsTable leads={leads} selectedId={selected?.lead.id} onSelect={setSelected} />
          </div>
        </main>

        <AnimatePresence>
          {selected ? (
            <LeadDetail key={selected.lead.id} lead={selected} onClose={() => setSelected(null)} />
          ) : null}
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}
