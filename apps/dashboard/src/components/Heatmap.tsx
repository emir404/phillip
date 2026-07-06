import type { SectionAttention } from "../lib/metrics";
import { formatDuration } from "../lib/metrics";

// Blue (cool / barely looked at) → red (hot / dwelled the longest).
function heat(intensity: number): string {
  const hue = Math.round(214 - (intensity / 100) * 206);
  return `hsl(${hue} 82% 52%)`;
}

// A section-level attention heatmap: which parts of the page held the lead's
// gaze the longest, ranked, with a heat-colored bar per section.
export function Heatmap({ attention }: { attention: SectionAttention[] }) {
  if (attention.length === 0) {
    return <p className="heatmap-empty">No section attention captured yet.</p>;
  }

  return (
    <div className="heatmap">
      {attention.map((a) => (
        <div key={a.section} className="heatmap-row">
          <span className="heatmap-name">{a.section}</span>
          <span className="heatmap-track">
            <span
              className="heatmap-fill"
              style={{ width: `${Math.max(a.intensity, 4)}%`, background: heat(a.intensity) }}
            />
          </span>
          <span className="heatmap-time tnum">{formatDuration(a.seconds)}</span>
        </div>
      ))}
    </div>
  );
}
