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

/** Below this the rail becomes a bottom sheet over a full-bleed site frame. */
export const MOBILE_BP = 768;
/** Collapsed sheet: handle + status + composer, nothing else. Matches `h-[224px]`. */
export const SHEET_PEEK_H = 224;
/** Expanded sheet: enough transcript to read, enough site to still see it. */
const SHEET_EXPANDED_RATIO = 0.7;

/**
 * The sheet's box. Kept here, next to the morph math, because the FLIP target
 * and the CSS height class must agree to the pixel or the rail lands crooked.
 */
export function sheetRect(vw: number, vh: number, expanded: boolean): Rect {
  const height = expanded ? Math.round(vh * SHEET_EXPANDED_RATIO) : SHEET_PEEK_H;
  return { left: 0, top: vh - height, width: vw, height };
}

/** Where the rail comes to rest: a right-hand column, or a peeking sheet. */
export function railFinalRect(vw = window.innerWidth, vh = window.innerHeight): Rect {
  if (vw < MOBILE_BP) return sheetRect(vw, vh, false);
  return { left: vw - 16 - 400, top: 16, width: 400, height: vh - 32 };
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
