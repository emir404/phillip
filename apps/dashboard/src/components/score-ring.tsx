"use client";

import { cn } from "@/lib/utils";
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
  const tone =
    pct >= 70
      ? "text-emerald-600 dark:text-emerald-400"
      : pct >= 40
        ? "text-amber-600 dark:text-amber-400"
        : "text-slate-500 dark:text-slate-400";

  return (
    <div className={cn("relative shrink-0", tone)} style={{ width: size, height: size }}>
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
          strokeWidth={stroke}
          className="stroke-foreground/10"
        />
        <m.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
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
        className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums"
        style={{ fontSize: size >= 56 ? undefined : 11 }}
      >
        {pct}
      </span>
    </div>
  );
}
