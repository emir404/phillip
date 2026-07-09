import { render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Phillip } from "./index";
import { isInsidePhillipFrame, mount } from "./mount";

// The isolation + dual-entry linchpin: a shadow-rooted host, the React root
// rendered *inside* the shadow, and a successful boot against the mock.
describe("mount", () => {
  it("creates a shadow-rooted host and renders the booted widget inside it", async () => {
    const { unmount } = render(<Phillip previewId="prv_demo" apiBase="" />);

    const host = await waitFor(() => {
      const h = document.querySelector<HTMLElement>("[data-phillip-host]");
      if (!h) throw new Error("host not attached yet");
      return h;
    });

    expect(host.shadowRoot).toBeTruthy();

    // The bubble appears inside the shadow once boot resolves.
    await waitFor(() => {
      expect(host.shadowRoot?.querySelector(".bubble")).toBeTruthy();
    });

    // And nothing leaked into the light DOM.
    expect(document.querySelector(".bubble")).toBeNull();

    unmount();
    await waitFor(() => {
      expect(document.querySelector("[data-phillip-host]")).toBeNull();
    });
  });

  // The takeover frames the site in an iframe of itself — the widget must
  // refuse to boot in there or it would recurse forever.
  it("never mounts inside its own preview frame", () => {
    const framed = { self: {}, top: {}, name: "phillip-preview" } as unknown as Window;
    expect(isInsidePhillipFrame(framed)).toBe(true);
    const topLevel = { self: window, top: window, name: "phillip-preview" } as unknown as Window;
    expect(isInsidePhillipFrame(topLevel)).toBe(false);
    const otherFrame = { self: {}, top: {}, name: "some-other-frame" } as unknown as Window;
    expect(isInsidePhillipFrame(otherFrame)).toBe(false);

    // mount() consults the real window (not framed under jsdom) — it should
    // mount normally; the guard path is covered by the predicate above plus
    // the early-return wiring.
    const dispose = mount({ previewId: "prv_demo", apiBase: "" });
    expect(document.querySelector("[data-phillip-host]")).toBeTruthy();
    dispose();
  });
});
