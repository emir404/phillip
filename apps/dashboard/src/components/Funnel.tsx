import { m, useReducedMotion } from "motion/react";
import type { DashboardLead } from "../data/sample";
import { funnel } from "../lib/analytics";
import { container, item } from "../motion";
import { STAGE_TONE } from "./StageBadge";

export function Funnel({ leads }: { leads: DashboardLead[] }) {
  const reduce = useReducedMotion() ?? false;
  const rungs = funnel(leads);
  const top = rungs[0]?.count || 1;

  return (
    <section className="card funnel" aria-label="conversion funnel">
      <header className="card-head">
        <h2>Funnel</h2>
        <span className="card-head-sub">delivered → paid → live</span>
      </header>
      <m.div
        className="funnel-rows"
        variants={container(reduce, 0.07)}
        initial="initial"
        animate="animate"
      >
        {rungs.map((r) => (
          <m.div key={r.stage} className="funnel-row" variants={item(reduce)}>
            <div className="funnel-meta">
              <span className="funnel-label">{r.label}</span>
              <span className="funnel-count tnum">{r.count}</span>
            </div>
            <div className="funnel-track">
              <m.div
                className={`funnel-fill tone-${STAGE_TONE[r.stage]}`}
                initial={{ width: reduce ? `${(r.count / top) * 100}%` : "0%" }}
                animate={{ width: `${(r.count / top) * 100}%` }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay: 0.15 }
                }
              />
            </div>
            <span className="funnel-pct tnum">{r.pctOfPrev}%</span>
          </m.div>
        ))}
      </m.div>
    </section>
  );
}
