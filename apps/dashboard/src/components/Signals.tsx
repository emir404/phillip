import type { SessionMetrics } from "../lib/metrics";
import { formatDuration } from "../lib/metrics";

// The at-a-glance analytics answer: how long they stayed, how far they scrolled,
// what device/browser they came in on, and how hard they engaged.
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

  return (
    <div className="signals-grid">
      {stats.map(([k, v]) => (
        <div key={k} className="signal-cell">
          <span className="signal-value tnum">{v}</span>
          <span className="signal-label">{k}</span>
        </div>
      ))}
    </div>
  );
}
