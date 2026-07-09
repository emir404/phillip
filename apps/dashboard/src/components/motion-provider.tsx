"use client";

import { LazyMotion, domAnimation } from "motion/react";
import type { ReactNode } from "react";

// One LazyMotion boundary for the whole authenticated app so every `m.`
// component below it stays on the slim animation bundle.
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
