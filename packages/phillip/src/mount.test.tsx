import { render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Phillip } from "./index";

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
});
