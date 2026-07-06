import { m, useReducedMotion } from "motion/react";

// A compact circular gauge for the engagement score. The arc draws itself in
// (stroke-dashoffset) — a small, satisfying reveal that respects reduced motion.
export function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const reduce = useReducedMotion() ?? false;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = c * (1 - pct / 100);
  const tone = pct >= 70 ? "#16a34a" : pct >= 40 ? "#d97706" : "#64748b";

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`engagement score ${pct} out of 100`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(15,23,42,.08)"
          strokeWidth={stroke}
        />
        <m.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
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
      <span className="score-ring-value tnum" style={{ color: tone }}>
        {pct}
      </span>
    </div>
  );
}
