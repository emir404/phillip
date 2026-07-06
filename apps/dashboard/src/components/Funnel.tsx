import { m, useReducedMotion } from "motion/react";
import type { DashboardLead } from "../data/sample";
import { funnel } from "../lib/analytics";
import { container, item } from "../motion";
import { STAGE_TONE } from "./StageBadge";

const TIER_H = 34;
const GAP = 3;
const MIN_WIDTH_PCT = 24;

export function Funnel({ leads }: { leads: DashboardLead[] }) {
  const reduce = useReducedMotion() ?? false;
  const rungs = funnel(leads);
  const top = rungs[0]?.count || 1;

  const scale = (count: number) => MIN_WIDTH_PCT + (100 - MIN_WIDTH_PCT) * (count / top);
  const totalH = rungs.length * TIER_H + (rungs.length - 1) * GAP;

  return (
    <section className="card funnel" aria-label="conversion funnel">
      <header className="card-head">
        <h2>Funnel</h2>
        <span className="card-head-sub">delivered → paid → live</span>
      </header>

      <div className="funnel-body">
        <svg
          className="funnel-chart"
          viewBox={`0 0 100 ${totalH}`}
          preserveAspectRatio="none"
          role="img"
          aria-hidden="true"
        >
          {rungs.map((r, i) => {
            const topW = scale(r.count);
            const next = rungs[i + 1];
            const botW = next ? scale(next.count) : topW;
            const y0 = i * (TIER_H + GAP);
            const y1 = y0 + TIER_H;
            const tl = (100 - topW) / 2;
            const tr = 100 - tl;
            const bl = (100 - botW) / 2;
            const br = 100 - bl;
            return (
              <m.polygon
                key={r.stage}
                points={`${tl},${y0} ${tr},${y0} ${br},${y1} ${bl},${y1}`}
                style={{
                  fill: `var(--tone-${STAGE_TONE[r.stage]}-fill)`,
                  stroke: "var(--card)",
                  strokeWidth: 1,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { duration: 0.4, delay: 0.06 * i, ease: [0.2, 0.8, 0.2, 1] }
                }
              />
            );
          })}
        </svg>

        <m.div
          className="funnel-stats"
          variants={container(reduce, 0.06)}
          initial="initial"
          animate="animate"
        >
          {rungs.map((r) => (
            <m.div key={r.stage} className="funnel-stat" variants={item(reduce)}>
              <span className="funnel-stat-label">{r.label}</span>
              <span className="funnel-stat-nums">
                <span className="funnel-stat-count tnum">{r.count}</span>
                <span className="funnel-stat-pct tnum">{r.pctOfPrev}%</span>
              </span>
            </m.div>
          ))}
        </m.div>
      </div>
    </section>
  );
}
