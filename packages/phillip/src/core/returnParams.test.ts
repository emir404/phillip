import { afterEach, describe, expect, it, vi } from "vitest";
import { readAndStripStripeReturn } from "./returnParams";

function visit(url: string) {
  window.history.replaceState(null, "", url);
}

describe("readAndStripStripeReturn", () => {
  afterEach(() => {
    // Restore first: the URL reset below goes through history.replaceState,
    // which one of these tests replaces with a thrower.
    vi.restoreAllMocks();
    visit("/");
  });

  it("reads a paid return and scrubs the parameter", () => {
    visit("/?phillip=paid");
    expect(readAndStripStripeReturn()).toBe("paid");
    expect(window.location.search).toBe("");
  });

  it("reads a cancelled return", () => {
    visit("/?phillip=checkout_cancelled");
    expect(readAndStripStripeReturn()).toBe("cancelled");
    expect(window.location.search).toBe("");
  });

  it("leaves the rest of the URL alone", () => {
    visit("/menu?utm=spring&phillip=paid#book");
    expect(readAndStripStripeReturn()).toBe("paid");
    expect(window.location.pathname).toBe("/menu");
    expect(window.location.search).toBe("?utm=spring");
    expect(window.location.hash).toBe("#book");
  });

  it("ignores an absent or unknown value without touching the URL", () => {
    visit("/?phillip=whatever&keep=1");
    expect(readAndStripStripeReturn()).toBeNull();
    expect(window.location.search).toBe("?phillip=whatever&keep=1");
  });

  it("still reports the outcome when history.replaceState throws", () => {
    visit("/?phillip=paid");
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readAndStripStripeReturn()).toBe("paid");
  });
});
