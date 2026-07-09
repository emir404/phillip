import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useBubbleGradientField } from "./useBubbleGradientField";

// Minimal transcript DOM the hook measures: the stage scroller wrapping the
// conversation column with one sent message (bubble + tail, like Message.tsx).
function buildTranscript() {
  const scroller = document.createElement("div");
  scroller.className = "stage-scroll";
  const convo = document.createElement("div");
  convo.className = "convo";
  const msg = document.createElement("div");
  msg.className = "msg lead";
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  const tail = document.createElement("span");
  tail.className = "msg-tail";
  bubble.append(tail);
  msg.append(bubble);
  convo.append(msg);
  scroller.append(convo);
  document.body.append(scroller);
  return { scroller, convo, bubble, tail };
}

// A layout box at viewport y = `top`; only top/height matter to the hook.
function rect(top: number, height: number): DOMRect {
  return {
    top,
    height,
    bottom: top + height,
    left: 0,
    right: 0,
    width: 0,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

// jsdom runs pretendToBeVisual under vitest, so real rAF frames are available.
const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

afterEach(() => {
  for (const el of document.querySelectorAll(".stage-scroll")) el.remove();
});

describe("useBubbleGradientField", () => {
  it("stays in fallback mode when the scroller can't be measured (jsdom default)", async () => {
    const { convo } = buildTranscript();
    renderHook(() => useBubbleGradientField({ current: convo }, []));

    // jsdom reports clientHeight 0 — the paint must bail without enabling
    // field mode, leaving the static per-bubble gradient in effect.
    await frame();
    await frame();
    expect(convo.classList.contains("grad-on")).toBe(false);
    expect(convo.style.getPropertyValue("--p-grad-h")).toBe("");
  });

  it("paints the field: --p-grad-h on the convo, clamped --p-grad-y per element", async () => {
    const { scroller, convo, bubble, tail } = buildTranscript();
    // A measurable viewport: 400px tall with its top edge at y=100.
    Object.defineProperty(scroller, "clientHeight", { configurable: true, value: 400 });
    scroller.getBoundingClientRect = () => rect(100, 400);
    // Bubble in view; tail scrolled above the viewport (offset must clamp to 0).
    bubble.getBoundingClientRect = () => rect(300, 40);
    tail.getBoundingClientRect = () => rect(60, 17);

    renderHook(() => useBubbleGradientField({ current: convo }, []));

    await waitFor(() => expect(convo.classList.contains("grad-on")).toBe(true));
    expect(convo.style.getPropertyValue("--p-grad-h")).toBe("400px");
    // scroller.top(100) - bubble.top(300) = -200, inside [height - fieldH, 0].
    expect(bubble.style.getPropertyValue("--p-grad-y")).toBe("-200.0px");
    // scroller.top(100) - tail.top(60) = +40 → clamped to the 0 upper bound.
    expect(tail.style.getPropertyValue("--p-grad-y")).toBe("0.0px");
  });
});
