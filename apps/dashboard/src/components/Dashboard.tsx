"use client";

import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { DashboardLead } from "../lib/types";
import { container, item } from "../motion";
import { Funnel } from "./Funnel";
import { KpiCards } from "./KpiCards";
import { LeadDetail } from "./LeadDetail";
import { LeadsTable } from "./LeadsTable";

// Server-rendered from the store, then kept live: the dashboard polls the read
// API so anything the agents push through the ingestion endpoints shows up
// within a few seconds without a manual refresh.
const POLL_MS = 5000;

export default function Dashboard({ initialLeads }: { initialLeads: DashboardLead[] }) {
  const reduce = useReducedMotion() ?? false;
  const [leads, setLeads] = useState<DashboardLead[]>(initialLeads);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = leads.find((l) => l.lead.id === selectedId) ?? null;

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch("/v1/leads", { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as DashboardLead[];
        if (alive) setLeads(next);
      } catch {
        // transient — keep the last good data and try again next tick.
      }
    };
    timer.current = setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

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
            <a className="btn btn-ghost" href="/v1/export" target="_blank" rel="noreferrer">
              Agent feed
            </a>
            <a
              className="btn btn-primary"
              href="/v1/export?format=ndjson"
              target="_blank"
              rel="noreferrer"
            >
              Export NDJSON
            </a>
          </m.div>
        </m.header>

        <main className="content">
          <KpiCards leads={leads} />
          <div className="grid">
            <Funnel leads={leads} />
            <LeadsTable
              leads={leads}
              selectedId={selected?.lead.id}
              onSelect={(l) => setSelectedId(l.lead.id)}
            />
          </div>
        </main>

        <AnimatePresence>
          {selected ? (
            <LeadDetail
              key={selected.lead.id}
              lead={selected}
              onClose={() => setSelectedId(null)}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}
