import { fireEvent, render, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { makeBootConfig } from "../../mock/fixtures";
import { server } from "../../mock/server";
import { Phillip } from "../index";

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
    expect(shadow.textContent ?? "").toMatch(/honest take/i);
  });
}

// Captured bodies of every iteration POST the widget makes during a test.
let iterationBodies: Array<{
  previewId: string;
  changeSet: { freeText?: string };
  sessionId?: string;
}>;

beforeEach(() => {
  iterationBodies = [];
  server.events.removeAllListeners();
  server.events.on("request:start", ({ request }) => {
    if (request.method === "POST" && new URL(request.url).pathname.endsWith("/v1/iterations")) {
      void request
        .clone()
        .json()
        .then((body) => iterationBodies.push(body as (typeof iterationBodies)[number]));
    }
  });
});

describe("conversation flow", () => {
  it("opens, greets, and streams a reply to a quick reply", async () => {
    const shadow = await mountWidget();
    await openStage(shadow);

    const iterateReply = await waitFor(() => {
      const btn = [...shadow.querySelectorAll<HTMLButtonElement>(".qr")].find((b) =>
        /looks good/i.test(b.textContent ?? ""),
      );
      if (!btn) throw new Error("quick replies not ready");
      return btn;
    });
    fireEvent.click(iterateReply);

    // The lead's choice echoes, then Phillip's reply streams in.
    await waitFor(
      () => {
        expect(shadow.textContent ?? "").toMatch(/tell me what to change/i);
      },
      { timeout: 4000 },
    );
  });

  it("chip path (no hint): takeover opens asking, a suggestion submits, frame flips on done", async () => {
    const shadow = await mountWidget();
    await openStage(shadow);

    const iterate = await waitFor(() => {
      const btn = [...shadow.querySelectorAll<HTMLButtonElement>(".qr")].find((b) =>
        /looks good/i.test(b.textContent ?? ""),
      );
      if (!btn) throw new Error("quick replies not ready");
      return btn;
    });
    fireEvent.click(iterate);

    // Hint-less start_iteration → the takeover opens with the prompt +
    // suggestion chips (the only path that may ask).
    const suggestion = await waitFor(
      () => {
        const dialog = shadow.querySelector('[role="dialog"]');
        if (!dialog) throw new Error("takeover not open");
        const s = [...dialog.querySelectorAll<HTMLButtonElement>("button")].find((b) =>
          /warmer palette/i.test(b.textContent ?? ""),
        );
        if (!s) throw new Error("suggestions not ready");
        return s;
      },
      { timeout: 4000 },
    );
    expect(shadow.querySelector('iframe[name="phillip-preview"]')).toBeTruthy();

    fireEvent.click(suggestion);

    // The build status runs inline and the frame re-keys to the new version.
    await waitFor(
      () => {
        const frame = shadow.querySelector<HTMLIFrameElement>('iframe[name="phillip-preview"]');
        expect(frame?.getAttribute("src") ?? "").toMatch(/\?v=\d+/);
      },
      { timeout: 6000 },
    );
    expect(shadow.textContent ?? "").not.toMatch(/give me a sec/i);

    // Closing after a completed build navigates the host page — jsdom can't
    // navigate, so close BEFORE asserting the return path is out of scope here.
  });

  it("typed concrete request: auto-submits the hint verbatim into the takeover, never re-asks", async () => {
    const shadow = await mountWidget();
    await openStage(shadow);

    const input = shadow.querySelector<HTMLInputElement>(".composer input");
    if (!input) throw new Error("no composer input");
    const ask = "lets change the name to 'Emir's Cafe'";
    fireEvent.change(input, { target: { value: ask } });
    const form = shadow.querySelector<HTMLFormElement>(".composer");
    if (!form) throw new Error("no composer form");
    fireEvent.submit(form);

    // The mock echoes the message back as the start_iteration hint; the widget
    // must POST it as freeText without asking anything.
    await waitFor(
      () => {
        expect(iterationBodies.length).toBe(1);
      },
      { timeout: 5000 },
    );
    expect(iterationBodies[0]?.changeSet.freeText).toBe(ask);
    expect(iterationBodies[0]?.sessionId).toBeTruthy();

    // The takeover is already building (no suggestions, no re-ask) and the
    // frame flips to the fresh version when the job lands.
    await waitFor(() => {
      expect(shadow.querySelector('[role="dialog"]')).toBeTruthy();
    });
    await waitFor(
      () => {
        const frame = shadow.querySelector<HTMLIFrameElement>('iframe[name="phillip-preview"]');
        expect(frame?.getAttribute("src") ?? "").toMatch(/\?v=\d+/);
      },
      { timeout: 6000 },
    );
    expect(shadow.textContent ?? "").toMatch(/live — take a look/i);
  });

  it("takeover close with no build returns to the floating chat", async () => {
    const shadow = await mountWidget();
    await openStage(shadow);

    fireEvent.click(
      await waitFor(() => {
        const btn = [...shadow.querySelectorAll<HTMLButtonElement>(".qr")].find((b) =>
          /looks good/i.test(b.textContent ?? ""),
        );
        if (!btn) throw new Error("quick replies not ready");
        return btn;
      }),
    );

    // The takeover is provably open once its site frame exists (the floating
    // Stage is also role=dialog, so anchor on takeover-only structure).
    const close = await waitFor(
      () => {
        if (!shadow.querySelector('iframe[name="phillip-preview"]')) {
          throw new Error("takeover not open");
        }
        const c = shadow.querySelector<HTMLButtonElement>('[aria-label="close editor"]');
        if (!c) throw new Error("no close pill");
        return c;
      },
      { timeout: 4000 },
    );
    fireEvent.click(close);

    await waitFor(() => {
      expect(shadow.querySelector('iframe[name="phillip-preview"]')).toBeNull();
      expect(shadow.querySelector(".stage")).toBeTruthy();
    });
  });

  it("resumed history renders both roles and opens with the agent", async () => {
    // Returning-lead boot: override the mock to attach the persisted thread.
    server.use(
      http.get("*/v1/preview/:id/boot", ({ params }) =>
        HttpResponse.json(makeBootConfig(String(params.id), { returning: true })),
      ),
    );

    const shadow = await mountWidget();
    await openStage(shadow);

    // Both sides of the persisted history are on screen…
    const text = shadow.textContent ?? "";
    expect(text).toMatch(/photos feel a bit dark/i); // lead
    expect(text).toMatch(/welcome back/i); // phillip
    // …and the transcript starts with the agent, not the lead.
    const first = shadow.querySelector(".msg");
    expect(first?.classList.contains("phillip")).toBe(true);
    // A resumed thread whose last word was Phillip's still greets with the
    // reaction chips (they vanished in prod when boot began attaching a
    // conversation to every session — regression guard).
    expect(shadow.querySelectorAll(".qr").length).toBeGreaterThan(0);
  });
});
