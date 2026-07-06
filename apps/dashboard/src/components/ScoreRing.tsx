import { m, useReducedMotion } from "motion/react";
import { useId } from "react";

// A compact circular gauge for the engagement score. The arc draws itself in
// (stroke-dashoffset) — a small, satisfying reveal that respects reduced
// motion. A thin stroke with a subtle brand gradient, not a thick flat ring:
// one accent color, but with the light-touch depth a gradient gives.
export function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const reduce = useReducedMotion() ?? false;
  // Strip colons: React's useId format (":r0:") isn't safe inside an SVG
  // url(#...) reference in every browser.
  const gradientId = `score-ring-${useId().replace(/:/g, "")}`;
  const compact = size <= 40;
  const stroke = compact ? 2.5 : 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = c * (1 - pct / 100);

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`engagement score ${pct} out of 100`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--brand-300)" />
            <stop offset="100%" stopColor="var(--brand-600)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--gray-200)"
          strokeWidth={stroke}
        />
        <m.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ strokeDashoffset: reduce ? offset : c }}
          animate={{ strokeDashoffset: offset }}
          transition={
            reduce ? { duration: 0 } : { duration: 0.9, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }
          }
        />
      </svg>
      <span
        className="score-ring-value tnum"
        style={{ color: "var(--brand-600)", fontSize: compact ? 11 : 18 }}
      >
        {pct}
      </span>
    </div>
  );
}
