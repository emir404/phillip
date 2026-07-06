import { m, useReducedMotion } from "motion/react";
import { relativeTime } from "../lib/analytics";
import type { DashboardLead } from "../lib/types";
import { container, item } from "../motion";
import { StageBadge } from "./StageBadge";

export function LeadsTable({
  leads,
  selectedId,
  onSelect,
}: {
  leads: DashboardLead[];
  selectedId?: string;
  onSelect: (lead: DashboardLead) => void;
}) {
  const reduce = useReducedMotion() ?? false;

  return (
    <section className="card leads" aria-label="leads">
      <header className="card-head">
        <h2>Leads</h2>
        <span className="card-head-sub">{leads.length} in the pipeline</span>
      </header>
      <div className="leads-head" aria-hidden="true">
        <span>Business</span>
        <span>Stage</span>
        <span>Score</span>
        <span>Context</span>
        <span>Last seen</span>
      </div>
      <m.div
        className="leads-rows"
        variants={container(reduce)}
        initial="initial"
        animate="animate"
      >
        {leads.map((l) => (
          <m.button
            type="button"
            key={l.lead.id}
            className={`leads-row${selectedId === l.lead.id ? " is-selected" : ""}`}
            variants={item(reduce)}
            onClick={() => onSelect(l)}
            whileHover={reduce ? undefined : { x: 2 }}
          >
            <span className="leads-biz">
              <span className="leads-biz-name">{l.lead.business}</span>
              <span className="leads-biz-sub">{l.lead.contact ?? l.lead.industry}</span>
            </span>
            <span>
              <StageBadge stage={l.lead.stage} />
            </span>
            <span className="leads-score">
              <span className="leads-score-bar">
                <span className="leads-score-fill" style={{ width: `${l.engagementScore}%` }} />
              </span>
              <span className="tnum">{l.engagementScore}</span>
            </span>
            <span className="leads-ctx">
              {l.session.device.type} · {l.session.geo?.city ?? "—"}
            </span>
            <span className="leads-seen tnum">{relativeTime(l.session.lastSeen)}</span>
          </m.button>
        ))}
      </m.div>
    </section>
  );
}
