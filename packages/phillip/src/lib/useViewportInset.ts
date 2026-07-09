import { useEffect, useState } from "react";

/**
 * How many pixels the on-screen keyboard covers at the bottom of the layout
 * viewport. Fixed-position elements anchored to the bottom are painted *under*
 * the keyboard on mobile; lifting them by this much keeps a focused composer
 * where the thumb can see it.
 *
 * Returns 0 on the server, on desktop, and anywhere `visualViewport` is
 * missing — every caller degrades to today's behaviour.
 */
export function useViewportInset(enabled = true): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const overlap = window.innerHeight - vv.height - vv.offsetTop;
      setInset(overlap > 1 ? Math.round(overlap) : 0);
    };
    // resize/scroll fire together and often — coalesce into one read per frame.
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    vv.addEventListener("resize", schedule);
    vv.addEventListener("scroll", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      vv.removeEventListener("resize", schedule);
      vv.removeEventListener("scroll", schedule);
      setInset(0);
    };
  }, [enabled]);

  return inset;
}
