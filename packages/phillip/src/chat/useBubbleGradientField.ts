import { type RefObject, useEffect } from "react";

/** Paints every lead bubble + tail as one continuous gradient field spanning
 *  the transcript viewport (the iMessage effect): the brand gradient is sized
 *  to the scroller and each element samples its own slice via --p-grad-y, so
 *  bubbles deepen as they sit lower on screen and bubble/tail stay seamless.
 *  Falls back to the static per-bubble gradient when the scroller can't be
 *  measured (jsdom, hidden). */
export function useBubbleGradientField(convoRef: RefObject<HTMLElement | null>, deps: unknown[]) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measures on transcript changes
  useEffect(() => {
    const convo = convoRef.current;
    const scroller = convo?.closest<HTMLElement>(".stage-scroll");
    if (!convo || !scroller) return;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const fieldH = scroller.clientHeight;
      if (fieldH <= 0) {
        convo.classList.remove("grad-on");
        return;
      }
      const top = scroller.getBoundingClientRect().top; // read phase — batch all rects
      const els = convo.querySelectorAll<HTMLElement>(".msg.lead .msg-bubble, .msg.lead .msg-tail");
      const out: Array<[HTMLElement, string]> = [];
      for (const el of els) {
        const r = el.getBoundingClientRect();
        const y = Math.min(0, Math.max(r.height - fieldH, top - r.top)); // image always covers the box
        out.push([el, `${y.toFixed(1)}px`]);
      }
      convo.style.setProperty("--p-grad-h", `${fieldH}px`); // write phase
      convo.classList.add("grad-on");
      for (const [el, y] of out) el.style.setProperty("--p-grad-y", y);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    schedule();
    const settle = setTimeout(schedule, 420); // entrance springs land
    scroller.addEventListener("scroll", schedule, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    ro?.observe(scroller);
    ro?.observe(convo);
    return () => {
      clearTimeout(settle);
      cancelAnimationFrame(raf);
      scroller.removeEventListener("scroll", schedule);
      ro?.disconnect();
    };
  }, deps);
}
