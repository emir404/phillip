import { m, useReducedMotion } from "motion/react";
import { useState } from "react";
import { relativeTime } from "../lib/analytics";
import { agentFeed, attention, sessionMetrics } from "../lib/metrics";
import type { DashboardLead } from "../lib/types";
import { drawer, item, scrim } from "../motion";
import { EventTimeline } from "./EventTimeline";
import { Heatmap } from "./Heatmap";
import { ScoreRing } from "./ScoreRing";
import { Signals } from "./Signals";
import { StageBadge } from "./StageBadge";
import { Transcript } from "./Transcript";

const AVATAR = "/phillip.jpg";

export function LeadDetail({ lead, onClose }: { lead: DashboardLead; onClose: () => void }) {
  const reduce = useReducedMotion() ?? false;
  const [copied, setCopied] = useState(false);
  const { device, geo } = lead.session;
  const metrics = sessionMetrics(lead);
  const atn = attention(lead);
  const feed = agentFeed(lead);
  const brief = feed.brief;

  const context: Array<[string, string]> = [
    ["Source", lead.lead.source],
    ["Device", `${device.type} · ${device.os}`],
    ["Browser", device.browser],
    ["Location", geo ? [geo.city, geo.region, geo.country].filter(Boolean).join(", ") : "—"],
    ["Referrer", lead.session.referrer ?? "direct"],
    ["Visitor", lead.session.returning ? "returning" : "first visit"],
    ["Preview", `v${lead.preview.version} · ${lead.preview.status}`],
    ["Last seen", relativeTime(lead.session.lastSeen)],
  ];

  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(feed, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard blocked — the Raw JSON link is the fallback.
    }
  };

  return (
    <>
      <m.div
        className="scrim"
        variants={scrim}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={onClose}
      />
      <m.aside
        className="drawer"
        variants={drawer(reduce)}
        initial="initial"
        animate="animate"
        exit="exit"
        aria-label={`${lead.lead.business} detail`}
      >
        <m.header className="drawer-head" variants={item(reduce)}>
          <div className="drawer-title">
            <h2>{lead.lead.business}</h2>
            <p>{lead.lead.contact ?? lead.lead.industry}</p>
          </div>
          <div className="drawer-title-right">
            <StageBadge stage={lead.lead.stage} />
            <button type="button" className="drawer-close" onClick={onClose} aria-label="close">
              ×
            </button>
          </div>
        </m.header>

        <m.div className="drawer-actions" variants={item(reduce)}>
          <button type="button" className="btn btn-primary" onClick={copyBrief}>
            {copied ? "Copied ✓" : "Copy agent brief"}
          </button>
          <a
            className="btn btn-ghost"
            href={`/v1/leads/${lead.lead.id}/export`}
            target="_blank"
            rel="noreferrer"
          >
            Raw JSON
          </a>
        </m.div>

        <m.div className="drawer-score card" variants={item(reduce)}>
          <ScoreRing score={lead.engagementScore} />
          <div>
            <span className="drawer-score-label">Engagement score</span>
            <p className="drawer-score-sub">
              weighted from dwell, scroll, time on pricing, and return visits
            </p>
          </div>
        </m.div>

        <m.section className="drawer-section" variants={item(reduce)}>
          <h3>Context</h3>
          <dl className="context-grid">
            {context.map(([k, v]) => (
              <div key={k} className="context-cell">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </m.section>

        <m.section className="drawer-section" variants={item(reduce)}>
          <h3>Signals</h3>
          <Signals metrics={metrics} />
        </m.section>

        <m.section className="drawer-section" variants={item(reduce)}>
          <h3>Attention heatmap</h3>
          <Heatmap attention={atn} />
        </m.section>

        <m.section className="drawer-section" variants={item(reduce)}>
          <h3>Agent brief</h3>
          <div className="brief">
            {brief.recommendedActions.length > 0 ? (
              <div className="brief-block">
                <span className="brief-label">Recommended actions</span>
                <ul className="brief-list">
                  {brief.recommendedActions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {brief.requestedChanges.length > 0 ? (
              <div className="brief-block">
                <span className="brief-label">Requested changes</span>
                <ul className="brief-list">
                  {brief.requestedChanges.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {brief.objections.length > 0 ? (
              <div className="brief-block">
                <span className="brief-label">Objections</span>
                <ul className="brief-list">
                  {brief.objections.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="brief-tags">
              {brief.winningSections.map((s) => (
                <span key={s} className="brief-tag brief-tag-win">
                  ★ {s}
                </span>
              ))}
              {brief.intent ? <span className="brief-tag">intent: {brief.intent}</span> : null}
              {brief.sentiment ? (
                <span className="brief-tag">sentiment: {brief.sentiment}</span>
              ) : null}
            </div>
          </div>
        </m.section>

        <m.section className="drawer-section" variants={item(reduce)}>
          <div className="drawer-section-head">
            <h3>Conversation</h3>
            <span className="drawer-persona">
              <img src={AVATAR} alt="Phillip" className="drawer-persona-img" />
              Phillip
            </span>
          </div>
          <Transcript conversation={lead.conversation} />
        </m.section>

        <m.section className="drawer-section" variants={item(reduce)}>
          <h3>Activity</h3>
          <EventTimeline events={lead.events} />
        </m.section>
      </m.aside>
    </>
  );
}
