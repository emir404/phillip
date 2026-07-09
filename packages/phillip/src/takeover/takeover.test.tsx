import { fireEvent, render, waitFor } from "@testing-library/react";
import { LazyMotion, domAnimation } from "motion/react";
import { describe, expect, it } from "vitest";
import type { Persona } from "../types/boot";
import { Takeover, type TakeoverProps } from "./Takeover";

const persona: Persona = {
  name: "phillip",
  title: "site builder",
  avatarUrl: "http://localhost/avatar.png",
};

function renderTakeover(over: Partial<TakeoverProps> = {}) {
  const props: TakeoverProps = {
    persona,
    business: "Marisol's",
    messages: [],
    streaming: false,
    // jsdom only materializes a contentDocument for about:blank frames; the
    // real browser gives the picker the actual site doc the same way.
    frameSrc: "about:blank",
    taskPhase: null,
    showSuggestions: false,
    busy: false,
    stageRect: null,
    onSubmit: () => {},
    onClose: () => {},
    ...over,
  };
  const utils = render(
    <LazyMotion features={domAnimation} strict>
      <Takeover {...props} />
    </LazyMotion>,
  );
  const frame = utils.container.querySelector<HTMLIFrameElement>('iframe[name="phillip-preview"]');
  if (!frame) throw new Error("no preview frame");
  return { ...utils, frame, props };
}

describe("takeover element picker", () => {
  it("shows the toggle once the frame loads, arms the picker into the frame doc", async () => {
    const { container, frame } = renderTakeover();
    expect(container.querySelector('[aria-label="pick an element"]')).toBeNull();

    // jsdom never fetches iframe srcs — fire the load the browser would.
    fireEvent.load(frame);
    const toggle = await waitFor(() => {
      const t = container.querySelector<HTMLButtonElement>('[aria-label="pick an element"]');
      if (!t) throw new Error("toggle not shown");
      return t;
    });

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    await waitFor(() => {
      const doc = frame.contentDocument;
      if (!doc) throw new Error("no contentDocument");
      // The picker's highlight overlay is injected into the framed document.
      expect(doc.body.querySelector("div")).toBeTruthy();
      expect(doc.documentElement.style.cursor).toBe("crosshair");
    });
  });

  it("escape disarms from the rail side and cleans the frame doc up", async () => {
    const { container, frame } = renderTakeover();
    fireEvent.load(frame);
    const toggle = await waitFor(() => {
      const t = container.querySelector<HTMLButtonElement>('[aria-label="pick an element"]');
      if (!t) throw new Error("toggle not shown");
      return t;
    });
    fireEvent.click(toggle);
    await waitFor(() => {
      expect(frame.contentDocument?.documentElement.style.cursor).toBe("crosshair");
    });

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(toggle.getAttribute("aria-pressed")).toBe("false");
      expect(frame.contentDocument?.documentElement.style.cursor).toBe("");
    });
  });

  it("hides the toggle while a build is in flight", async () => {
    const { container, frame, rerender, props } = renderTakeover();
    fireEvent.load(frame);
    await waitFor(() => {
      expect(container.querySelector('[aria-label="pick an element"]')).toBeTruthy();
    });

    rerender(
      <LazyMotion features={domAnimation} strict>
        <Takeover {...props} busy />
      </LazyMotion>,
    );
    const toggle = container.querySelector<HTMLButtonElement>('[aria-label="pick an element"]');
    // Still rendered but disabled and disarmed while building.
    expect(toggle?.disabled).toBe(true);
    expect(toggle?.getAttribute("aria-pressed")).toBe("false");
  });
});
