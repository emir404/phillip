import type { SectionAttention } from "@/lib/metrics";
import { formatDuration } from "@/lib/metrics";

// A sequential brand-blue ramp: faint (barely looked at) → saturated (dwelled
// the longest). Inline style because the mix is continuous; color-mix against
// transparent keeps it sitting well on both light and dark card surfaces.
function heat(intensity: number): string {
  const pct = Math.round(15 + (intensity / 100) * 80);
  return `color-mix(in oklch, var(--brand) ${pct}%, transparent)`;
}

// A section-level attention heatmap: which parts of the page held the lead's
// gaze the longest, ranked, with a heat-colored bar per section. The top two
// sections carry a ★ — they're the "winning sections" the agent brief keeps.
export function Heatmap({ attention }: { attention: SectionAttention[] }) {
  if (attention.length === 0) {
    return <p className="text-sm text-muted-foreground">No section attention captured yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {attention.map((a, i) => (
        <div key={a.section} className="grid grid-cols-[7rem_1fr_3.5rem] items-center gap-3">
          <span className="truncate text-sm" title={a.section}>
            {i < 2 ? (
              <span
                className="mr-1 text-amber-500 dark:text-amber-400"
                aria-label="winning section"
              >
                ★
              </span>
            ) : null}
            {a.section}
          </span>
          <span className="h-2.5 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full"
              style={{ width: `${Math.max(a.intensity, 4)}%`, background: heat(a.intensity) }}
            />
          </span>
          <span className="text-right text-xs text-muted-foreground tabular-nums">
            {formatDuration(a.seconds)}
          </span>
        </div>
      ))}
    </div>
  );
}
