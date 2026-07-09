// Shared motion language for the whole widget. One source of truth so every
// surface enters/exits with the same physics, and reduced-motion is honored in
// a single place. We standardize on the article's recipe: enters combine
// blur + opacity + position; exits are faster, travel less, and drop the blur.
//
// All variants are *factories* taking a `reduce` flag (from useReducedMotion):
// when reduced, they collapse to opacity-only with no blur/transform so the UI
// still cross-fades but never moves or defocuses.
import type { Transition, Variants } from "motion/react";

// --- transitions -----------------------------------------------------------

export const spring = {
  // Panels and notifications — confident, quick to settle.
  snappy: { type: "spring", stiffness: 420, damping: 34, mass: 0.9 } as Transition,
  // Message bubbles — a touch softer so a burst of messages feels organic.
  gentle: { type: "spring", stiffness: 300, damping: 30 } as Transition,
};

// Exits accelerate out (ease-in) and are deliberately shorter than enters.
export const exitTween: Transition = { duration: 0.16, ease: [0.4, 0, 1, 1] };

// Press/hover feedback. 0.96 is the smallest tap scale that still reads as
// tactile without feeling exaggerated (never go below 0.95).
export const press = { scale: 0.96 } as const;
export const hoverLift = { scale: 1.03 } as const;
export const tapTransition: Transition = { duration: 0.12 };

// Stagger for the message list / panel contents — kept small so a full panel
// settles in well under ~350ms and reads crisp rather than slow.
export const staggerChildren = 0.05;

// --- generic container / item -----------------------------------------------
// The shared "seamless" recipe applied across every surface: children enter
// with blur + opacity + position and cascade via the parent's stagger. Anything
// that used to just pop in gets this so the whole widget breathes as one.

export function containerVariants(reduce: boolean, stagger = staggerChildren): Variants {
  return {
    initial: {},
    animate: {
      transition: {
        staggerChildren: reduce ? 0 : stagger,
        delayChildren: reduce ? 0 : 0.03,
      },
    },
    exit: {
      transition: {
        staggerChildren: reduce ? 0 : stagger * 0.6,
        staggerDirection: -1,
      },
    },
  };
}

// A single element inside a container. Enter combines blur + opacity + a short
// upward travel; exit is faster and drops the blur. Reduced motion collapses to
// an opacity-only cross-fade with no movement or defocus.
export function itemVariants(reduce: boolean): Variants {
  if (reduce) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.12 } },
      exit: { opacity: 0, transition: { duration: 0.12 } },
    };
  }
  return {
    initial: { opacity: 0, y: 10, scale: 0.98, filter: "blur(6px)" },
    animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: spring.gentle },
    exit: { opacity: 0, y: 6, filter: "blur(3px)", transition: exitTween },
  };
}

// --- variant factories ------------------------------------------------------

// `enterDelay` holds the panel back a beat (used when the stage reappears as
// the takeover rail glides home, so the two land together). The exit is
// dynamic: when the flow is switching INTO the takeover the backdrop covers
// the stage and the rail morphs out of its place — a fast fade is all that's
// honest there; every other exit keeps the blur/slide.
export function panelVariants(reduce: boolean, enterDelay = 0): Variants {
  if (reduce) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.12, delay: enterDelay } },
      exit: { opacity: 0, transition: { duration: 0.12 } },
    };
  }
  return {
    initial: { opacity: 0, y: 12, scale: 0.96, filter: "blur(8px)" },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: { ...spring.snappy, delay: enterDelay },
    },
    exit: (c?: { toIteration?: boolean }) =>
      c?.toIteration
        ? { opacity: 0, transition: { duration: 0.12 } }
        : { opacity: 0, y: 8, scale: 0.98, filter: "blur(4px)", transition: exitTween },
  };
}

export function notificationVariants(reduce: boolean): Variants {
  if (reduce) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.12 } },
      exit: { opacity: 0, transition: { duration: 0.12 } },
    };
  }
  return {
    initial: { opacity: 0, y: 16, scale: 0.97, filter: "blur(6px)" },
    animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: spring.snappy },
    // Slides toward the bottom-right corner it lives in as it leaves.
    exit: { opacity: 0, x: 24, filter: "blur(4px)", transition: exitTween },
  };
}

export function messageVariants(reduce: boolean): Variants {
  if (reduce) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.12 } },
    };
  }
  return {
    initial: { opacity: 0, y: 8, scale: 0.98, filter: "blur(4px)" },
    animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: spring.gentle },
  };
}

// Vignette is a flat opacity fade — never moves, never blurs (it *is* the blur).
export function vignetteVariants(reduce: boolean): Variants {
  const transition: Transition = reduce
    ? { duration: 0.12 }
    : { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] };
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition },
    exit: { opacity: 0, transition },
  };
}
