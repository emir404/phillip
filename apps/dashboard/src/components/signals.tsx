import { type SessionMetrics, formatDuration } from "@/lib/metrics";

// The at-a-glance analytics answer: how long they stayed, how far they
// scrolled, what device/browser they came in on, and how hard they engaged.
export function Signals({ metrics }: { metrics: SessionMetrics }) {
  const stats: Array<[string, string]> = [
    ["Time on page", formatDuration(metrics.timeOnPageSec)],
    ["Active time", formatDuration(metrics.activeTimeSec)],
    ["Scroll depth", `${metrics.scrollDepthPct}%`],
    ["Sections seen", String(metrics.sectionsViewed)],
    ["Clicks", String(metrics.clicks)],
    ["CTA hovers", String(metrics.ctaHovers)],
    ["Gallery opens", String(metrics.galleryOpens)],
    ["Video plays", String(metrics.videoPlays)],
    ["Contact taps", String(metrics.contactInteractions)],
    ["Messages", `${metrics.messagesSent}↑ / ${metrics.messagesReceived}↓`],
    ["Iteration rounds", String(metrics.iterationRounds)],
    ["Viewport", `${metrics.device.viewport.width}×${metrics.device.viewport.height}`],
  ];

  const geo = metrics.geo
    ? [metrics.geo.city, metrics.geo.region, metrics.geo.country].filter(Boolean).join(", ")
    : "—";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-x-3 gap-y-4">
        {stats.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <p className="truncate text-base font-semibold tabular-nums">{v}</p>
            <p className="truncate text-xs text-muted-foreground">{k}</p>
          </div>
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t pt-3 text-xs sm:grid-cols-3">
        {(
          [
            ["Device", `${metrics.device.type} · ${metrics.device.os}`],
            ["Browser", metrics.device.browser],
            ["Location", geo],
            ["Referrer", metrics.referrer],
            ["Visitor", metrics.returning ? "returning" : "first visit"],
            ["Source", metrics.source],
          ] as Array<[string, string]>
        ).map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="truncate font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
