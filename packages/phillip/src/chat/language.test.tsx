import { fireEvent, render, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { makeBootConfig } from "../../mock/fixtures";
import { server } from "../../mock/server";
import type { Language } from "../i18n";
import { Phillip } from "../index";

// The lead never sees `persona.language` — they see the opening line, the three
// chips, the resting peek beside the bubble, and the composer. Those come from
// different places, so boot the widget for real and read the shadow DOM rather
// than trusting any one of them on its own.
function bootIn(language: Language) {
  server.use(
    http.get("*/v1/preview/:id/boot", ({ params }) => {
      const boot = makeBootConfig(String(params.id));
      return HttpResponse.json({ ...boot, persona: { ...boot.persona, language } });
    }),
  );
}

async function mount(): Promise<ShadowRoot> {
  render(<Phillip previewId="prv_demo" apiBase="" />);
  return waitFor(() => {
    const host = document.querySelector<HTMLElement>("[data-phillip-host]");
    if (!host?.shadowRoot) throw new Error("widget not mounted yet");
    return host.shadowRoot;
  });
}

async function mountAndOpen(): Promise<ShadowRoot> {
  const shadow = await mount();
  const bubble = await waitFor(() => {
    const b = shadow.querySelector<HTMLButtonElement>(".bubble");
    if (!b) throw new Error("no bubble");
    return b;
  });
  fireEvent.click(bubble);
  await waitFor(() => expect(shadow.querySelector(".stage")).toBeTruthy());
  return shadow;
}

// The peek lands 1.6s after mount, so it needs more than waitFor's 1s default.
async function restingPeek(shadow: ShadowRoot): Promise<string> {
  const el = await waitFor(
    () => {
      const n = shadow.querySelector(".nudge-msg");
      if (!n) throw new Error("no peek yet");
      return n;
    },
    { timeout: 3000 },
  );
  return el.textContent ?? "";
}

describe("the stage, in the lead's language", () => {
  it("greets and offers its reaction chips in German", async () => {
    bootIn("de");
    const shadow = await mountAndOpen();

    await waitFor(() => {
      const text = shadow.textContent ?? "";
      expect(text).toContain("Ganz ehrlich");
      expect(text).toContain("Gefällt mir");
      expect(text).toContain("Eher nicht");
      // The English copy must be gone, not merely joined by German.
      expect(text).not.toMatch(/honest take/i);
      expect(text).not.toMatch(/love it/i);
    });
  });

  it("still speaks English when boot carries no language", async () => {
    const shadow = await mountAndOpen();
    await waitFor(() => {
      const text = shadow.textContent ?? "";
      expect(text).toMatch(/honest take/i);
      expect(text).toContain("love it");
    });
  });

  it("localizes the composer it types into", async () => {
    bootIn("de");
    const shadow = await mountAndOpen();
    await waitFor(() => {
      const input = shadow.querySelector("input");
      expect(input?.getAttribute("placeholder")).toBe("Nachricht schreiben…");
    });
  });
});

describe("the resting peek beside the bubble", () => {
  // It used to be its own English sentence ("…— got a sec?"), so a German lead
  // was greeted in German inside the stage and in English on the bubble.
  it("is the opening line itself, not a second version of it", async () => {
    const shadow = await mount();
    const peek = await restingPeek(shadow);
    expect(peek).toMatch(/honest take/i);
    expect(peek).not.toMatch(/got a sec/i);
  });

  it("follows the lead's language", async () => {
    bootIn("de");
    const shadow = await mount();
    const peek = await restingPeek(shadow);
    expect(peek).toContain("Ganz ehrlich");
    expect(peek).toContain("Diese Seite habe ich für");
    expect(peek).not.toMatch(/i built this one for/i);
  });

  it("localizes the presence label next to Phillip's name", async () => {
    bootIn("fr");
    const shadow = await mount();
    await restingPeek(shadow);
    const live = shadow.querySelector(".nudge-live");
    expect(live?.textContent).toContain("en ligne");
    expect(live?.textContent).not.toContain("online");
  });
});
