import { fireEvent, render, waitFor } from "@testing-library/react";
import { LazyMotion, domAnimation } from "motion/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Persona } from "../types/boot";
import { Takeover, type TakeoverProps } from "./Takeover";
import { SHEET_PEEK_H } from "./morph";

const DESKTOP_W = window.innerWidth;

function setViewport(width: number, height = 844) {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: height, configurable: true });
}

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

describe("takeover on a phone", () => {
  afterEach(() => setViewport(DESKTOP_W, 768));

  it("keeps the site visible and turns the rail into a peeking sheet", () => {
    setViewport(390);
    const { container } = renderTakeover();

    const frameWrap = container.querySelector<HTMLElement>(
      'iframe[name="phillip-preview"]',
    )?.parentElement;
    // The site used to be display:none here — the whole point of the redesign.
    expect(frameWrap?.className).toContain("inset-0");
    expect(frameWrap?.className).not.toContain("max-md:hidden");

    const handle = container.querySelector<HTMLButtonElement>("[aria-expanded]");
    if (!handle) throw new Error("no sheet handle");
    const sheet = handle.closest("div")?.parentElement;
    expect(sheet?.className).toContain(`h-[${SHEET_PEEK_H}px]`);
    expect(sheet?.className).toContain("rounded-t-2xl");

    // Close has to be reachable without the rail header.
    expect(container.querySelectorAll('[aria-label="close editor"]').length).toBe(1);
  });

  it("expands and collapses the sheet from the handle", () => {
    setViewport(390);
    const { container } = renderTakeover();
    const handle = container.querySelector<HTMLButtonElement>("[aria-expanded]");
    if (!handle) throw new Error("no sheet handle");
    const sheet = handle.closest("div")?.parentElement;

    expect(handle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(handle);
    expect(handle.getAttribute("aria-expanded")).toBe("true");
    expect(sheet?.className).toContain("h-[70dvh]");

    fireEvent.click(handle);
    expect(handle.getAttribute("aria-expanded")).toBe("false");
    expect(sheet?.className).toContain(`h-[${SHEET_PEEK_H}px]`);
  });

  it("shows build status while the sheet is collapsed", () => {
    setViewport(390);
    const { container } = renderTakeover({ taskPhase: "working", busy: true });
    expect(container.querySelector('[data-phase="working"]')).toBeTruthy();
  });

  it("keeps the desktop rail beside the framed site", () => {
    setViewport(1440, 900);
    const { container } = renderTakeover();
    const frameWrap = container.querySelector<HTMLElement>(
      'iframe[name="phillip-preview"]',
    )?.parentElement;
    expect(frameWrap?.className).toContain("right-[432px]");
    expect(container.querySelector("[aria-expanded]")).toBeNull();
  });
});
