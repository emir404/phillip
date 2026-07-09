"use client";

import { Funnel } from "@/components/funnel";
import { KpiCards } from "@/components/kpi-cards";
import { LeadsTable } from "@/components/leads-table";
import { NewLeadDialog } from "@/components/new-lead-dialog";
import type { DashboardLead } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

// Server-rendered from the store, then kept live: the overview polls the read
// API so anything the agents push through the ingestion endpoints shows up
// within a few seconds without a manual refresh.
const POLL_MS = 5000;

function LiveIndicator({ updatedAt }: { updatedAt: number }) {
  const [now, setNow] = useState(updatedAt);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.round((now - updatedAt) / 1000));

  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="relative flex size-2" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      <span className="tabular-nums" suppressHydrationWarning>
        live · updated {secs}s ago
      </span>
    </span>
  );
}

export function Overview({ initialLeads }: { initialLeads: DashboardLead[] }) {
  const [leads, setLeads] = useState<DashboardLead[]>(initialLeads);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch("/v1/leads", { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as DashboardLead[];
        if (alive) {
          setLeads(next);
          setUpdatedAt(Date.now());
        }
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
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Every lead on a preview, from delivered to live.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <LiveIndicator updatedAt={updatedAt} />
          <NewLeadDialog />
        </div>
      </header>

      <KpiCards leads={leads} />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(300px,2fr)_5fr]">
        <Funnel leads={leads} />
        <LeadsTable leads={leads} />
      </div>
    </div>
  );
}
