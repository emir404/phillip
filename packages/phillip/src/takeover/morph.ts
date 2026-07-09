import type { TargetAndTransition } from "motion/react";
import { exitTween, spring } from "../overlay/motion";

// Manual FLIP for the stage ⇄ takeover-rail morph. LazyMotion ships only
// `domAnimation` (no layout projection), so the rail tweens x/y/width/height
// between two known boxes: the floating stage's rect, captured the instant the
// flow switches, and the rail's slot, which is analytic because the takeover
// positions its children absolutely.

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Snapshot an element's box; null when unmeasurable (jsdom, unmounted). */
export function captureRect(el: HTMLElement | null): Rect | null {
  const r = el?.getBoundingClientRect();
  return r && r.width > 0 && r.height > 0
    ? { left: r.left, top: r.top, width: r.width, height: r.height }
    : null;
}

/** Mirrors the rail's CSS slot: 16px inset, 400px wide, full-bleed under 768. */
export function railFinalRect(vw = window.innerWidth, vh = window.innerHeight): Rect {
  const width = vw < 768 ? vw - 32 : 400;
  return { left: vw - 16 - width, top: 16, width, height: vh - 32 };
}

export interface MorphCustom {
  stageRect: Rect | null;
  toIteration: boolean;
  reduce: boolean;
}

export interface RailEnter {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
}

/** Rail entrance: morph from the stage's box, or slide in when there isn't one. */
export function railEnter(stage: Rect | null, final: Rect, reduce: boolean): RailEnter {
  if (reduce || !stage) {
    return {
      initial: { opacity: 0, x: reduce ? 0 : 24 },
      animate: {
        opacity: 1,
        x: 0,
        transition: reduce ? { duration: 0.12 } : spring.snappy,
      },
    };
  }
  return {
    initial: {
      x: stage.left - final.left,
      y: stage.top - final.top,
      width: stage.width,
      height: stage.height,
      opacity: 1,
    },
    animate: {
      x: 0,
      y: 0,
      width: final.width,
      height: final.height,
      opacity: 1,
      transition: spring.snappy,
    },
  };
}

/** Rail exit: glide back to where the stage reappears; plain fade otherwise. */
export function railExit(c: MorphCustom | undefined, final: Rect): TargetAndTransition {
  if (!c?.stageRect || c.reduce) {
    return { opacity: 0, transition: exitTween };
  }
  return {
    x: c.stageRect.left - final.left,
    y: c.stageRect.top - final.top,
    width: c.stageRect.width,
    height: c.stageRect.height,
    opacity: 0,
    transition: { ...spring.snappy, opacity: { delay: 0.22, duration: 0.12 } },
  };
}
