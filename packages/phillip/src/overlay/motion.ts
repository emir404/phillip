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

// --- variant factories ------------------------------------------------------

export function panelVariants(reduce: boolean): Variants {
  if (reduce) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.12 } },
      exit: { opacity: 0, transition: { duration: 0.12 } },
    };
  }
  return {
    initial: { opacity: 0, y: 12, scale: 0.96, filter: "blur(8px)" },
    animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: spring.snappy },
    exit: { opacity: 0, y: 8, scale: 0.98, filter: "blur(4px)", transition: exitTween },
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
