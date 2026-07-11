import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Phillip } from "../index";

// The floating chat's paperclip: picking a file IS a change request, so the
// takeover must open with the file already pinned to its rail.

async function mountWidget(): Promise<ShadowRoot> {
  render(<Phillip previewId="prv_demo" apiBase="" />);
  return waitFor(() => {
    const host = document.querySelector<HTMLElement>("[data-phillip-host]");
    if (!host?.shadowRoot) throw new Error("widget not mounted yet");
    return host.shadowRoot;
  });
}

async function openStage(shadow: ShadowRoot): Promise<void> {
  const bubble = await waitFor(() => {
    const b = shadow.querySelector<HTMLButtonElement>(".bubble");
    if (!b) throw new Error("no bubble");
    return b;
  });
  fireEvent.click(bubble);
  await waitFor(() => {
    expect(shadow.querySelector(".stage")).toBeTruthy();
  });
}

describe("floating-chat attachments", () => {
  it("shows a paperclip and opens the takeover with the picked file pinned", async () => {
    const shadow = await mountWidget();
    await openStage(shadow);

    const input = await waitFor(() => {
      const el = shadow.querySelector<HTMLInputElement>('.composer input[type="file"]');
      if (!el) throw new Error("no attach input in the chat composer");
      return el;
    });
    expect(shadow.querySelector(".composer button.attach")).toBeTruthy();

    const file = new File([new Uint8Array([37, 80, 68, 70])], "speisekarte.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(input, { target: { files: [file] } });

    // Takeover open (its site frame exists) and the rail carries the chip.
    await waitFor(
      () => {
        if (!shadow.querySelector('iframe[name="phillip-preview"]')) {
          throw new Error("takeover not open");
        }
        expect(shadow.textContent ?? "").toContain("speisekarte.pdf");
      },
      { timeout: 4000 },
    );
  });
});
