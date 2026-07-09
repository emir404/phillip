"use client";

import { ActivityChart } from "@/components/activity-chart";
import { ActivityFeed } from "@/components/activity-feed";
import { Funnel } from "@/components/funnel";
import { KpiCards } from "@/components/kpi-cards";
import { useLiveLeads } from "@/components/live-leads";
import { RecentLeads } from "@/components/recent-leads";

// Data arrives via the layout-level LiveLeadsProvider (server-seeded, then
// polled every few seconds); the live indicator and new-lead action live in
// the site header.
export function Overview() {
  const { leads } = useLiveLeads();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Every lead on a preview, from delivered to live.
        </p>
      </header>

      <KpiCards leads={leads} />

      <div className="grid items-stretch gap-4 lg:grid-cols-5">
        <Funnel leads={leads} className="lg:col-span-2" />
        <ActivityChart leads={leads} className="lg:col-span-3" />
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-3">
        <RecentLeads leads={leads} className="lg:col-span-2" />
        <ActivityFeed leads={leads} />
      </div>
    </div>
  );
}
