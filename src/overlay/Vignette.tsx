import { m, useReducedMotion } from "motion/react";
import { vignetteVariants } from "./motion";

// A soft radial darkening anchored to the bottom-right corner. Purely framing —
// it never receives pointer events — so notifications layered on top read
// clearly against it. Mounted only while a notification is live.
export function Vignette() {
  const reduce = useReducedMotion() ?? false;
  return (
    <m.div
      className="vignette"
      aria-hidden="true"
      variants={vignetteVariants(reduce)}
      initial="initial"
      animate="animate"
      exit="exit"
    />
  );
}
