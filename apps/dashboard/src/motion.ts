import type { Transition, Variants } from "motion/react";

// The same "seamless" motion language as the embed: enters combine blur +
// opacity + position, everything staggers, and reduced motion collapses to a
// plain opacity cross-fade. Kept in one place so every view breathes as one.

export const spring: Transition = { type: "spring", stiffness: 320, damping: 32, mass: 0.9 };
export const exitTween: Transition = { duration: 0.16, ease: [0.4, 0, 1, 1] };
export const staggerChildren = 0.055;

export function container(reduce: boolean, stagger = staggerChildren): Variants {
  return {
    initial: {},
    animate: {
      transition: {
        staggerChildren: reduce ? 0 : stagger,
        delayChildren: reduce ? 0 : 0.04,
      },
    },
    exit: {
      transition: { staggerChildren: reduce ? 0 : stagger * 0.5, staggerDirection: -1 },
    },
  };
}

export function item(reduce: boolean): Variants {
  if (reduce) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.14 } },
      exit: { opacity: 0, transition: { duration: 0.12 } },
    };
  }
  return {
    initial: { opacity: 0, y: 14, scale: 0.98, filter: "blur(8px)" },
    animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: spring },
    exit: { opacity: 0, y: 8, filter: "blur(4px)", transition: exitTween },
  };
}

// A drawer sliding in from the right — blur + opacity + position, same physics.
export function drawer(reduce: boolean): Variants {
  if (reduce) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.14 } },
      exit: { opacity: 0, transition: { duration: 0.12 } },
    };
  }
  return {
    initial: { opacity: 0, x: 36, filter: "blur(10px)" },
    animate: {
      opacity: 1,
      x: 0,
      filter: "blur(0px)",
      transition: { ...spring, staggerChildren, delayChildren: 0.06 },
    },
    exit: { opacity: 0, x: 28, filter: "blur(8px)", transition: exitTween },
  };
}

export const scrim: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.16 } },
};
