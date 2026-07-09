"use client";

import type { DashboardLead } from "@/lib/types";
import { type ReactNode, createContext, useContext, useEffect, useState } from "react";

// One poll for the whole authenticated app: the layout seeds this provider from
// the store, then anything the agents push through the ingestion endpoints
// shows up within a few seconds on every surface that consumes the context —
// overview, leads table, sidebar badge, and the header's live indicator.
const POLL_MS = 5000;

type LiveLeads = { leads: DashboardLead[]; updatedAt: number };

const LiveLeadsContext = createContext<LiveLeads | null>(null);

export function LiveLeadsProvider({
  initialLeads,
  children,
}: {
  initialLeads: DashboardLead[];
  children: ReactNode;
}) {
  const [state, setState] = useState<LiveLeads>(() => ({
    leads: initialLeads,
    updatedAt: Date.now(),
  }));

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch("/v1/leads", { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as DashboardLead[];
        if (alive) setState({ leads: next, updatedAt: Date.now() });
      } catch {
        // transient — keep the last good data and try again next tick.
      }
    };
    const timer = setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  return <LiveLeadsContext.Provider value={state}>{children}</LiveLeadsContext.Provider>;
}

export function useLiveLeads(): LiveLeads {
  const ctx = useContext(LiveLeadsContext);
  if (!ctx) throw new Error("useLiveLeads must be used within LiveLeadsProvider");
  return ctx;
}

export function LiveIndicator({ className }: { className?: string }) {
  const { updatedAt } = useLiveLeads();
  const [now, setNow] = useState(updatedAt);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.round((now - updatedAt) / 1000));

  return (
    <span className={`flex items-center gap-2 text-xs text-muted-foreground ${className ?? ""}`}>
      <span className="relative flex size-2" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      <span className="tabular-nums" suppressHydrationWarning>
        live · {secs}s
      </span>
    </span>
  );
}
