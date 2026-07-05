import type { AnalyticsEvent } from "@nutz/phillip";
import { m, useReducedMotion } from "motion/react";
import { clockTime, eventLabel } from "../lib/analytics";
import { container, item } from "../motion";

// A short, human description of an event's payload, when it carries one.
function detail(e: AnalyticsEvent): string | null {
  const p = e.payload as Record<string, unknown>;
  switch (e.type) {
    case "section_view":
      return typeof p.section === "string" ? p.section : null;
    case "cta_hover":
      return typeof p.target === "string" ? `“${p.target}”` : null;
    case "ping_shown":
      return typeof p.reason === "string" ? `${p.reason} · score ${p.score}` : null;
    case "conversation_opened":
      return typeof p.trigger === "string" ? String(p.trigger) : null;
    case "intent_classified":
      return [p.intent, p.sentiment].filter(Boolean).join(" · ") || null;
    case "iteration_requested":
      return typeof p.round === "number" ? `round ${p.round}` : null;
    case "funnel":
      return p.from ? `${p.from} → ${p.to}` : String(p.to ?? "");
    case "escalated":
      return typeof p.email === "string" ? String(p.email) : null;
    default:
      return null;
  }
}

// A signal is "notable" (filled marker) when it's a conversation/funnel moment
// rather than an ambient page signal.
const NOTABLE = new Set([
  "ping_shown",
  "conversation_opened",
  "intent_classified",
  "iteration_requested",
  "iteration_ready",
  "escalated",
  "checkout_started",
  "paid",
  "funnel",
]);

export function EventTimeline({ events }: { events: AnalyticsEvent[] }) {
  const reduce = useReducedMotion() ?? false;
  const ordered = [...events].reverse();

  return (
    <m.ol
      className="timeline"
      variants={container(reduce, 0.04)}
      initial="initial"
      animate="animate"
    >
      {ordered.map((e) => {
        const d = detail(e);
        return (
          <m.li key={e.id} className="timeline-item" variants={item(reduce)}>
            <span className={`timeline-marker${NOTABLE.has(e.type) ? " is-notable" : ""}`} />
            <span className="timeline-body">
              <span className="timeline-label">{eventLabel(e.type)}</span>
              {d ? <span className="timeline-detail">{d}</span> : null}
            </span>
            <span className="timeline-time tnum">{clockTime(e.ts)}</span>
          </m.li>
        );
      })}
    </m.ol>
  );
}
