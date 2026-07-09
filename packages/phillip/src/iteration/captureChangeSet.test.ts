import { describe, expect, it } from "vitest";
import { ITERATION_OPTIONS, captureChangeSet, isHeavyRequest } from "./captureChangeSet";

const opt = (id: string) => {
  const found = ITERATION_OPTIONS.find((o) => o.id === id);
  if (!found) throw new Error(`no option ${id}`);
  return found;
};

describe("captureChangeSet", () => {
  it("maps selected guided options to change items", () => {
    const cs = captureChangeSet([opt("warmer"), opt("swap_hero")]);
    expect(cs.items).toEqual([
      { kind: "palette", target: undefined, value: "warmer" },
      { kind: "photo_swap", target: "hero", value: undefined },
    ]);
    expect(cs.freeText).toBeUndefined();
  });

  it("carries trimmed free text and drops empty", () => {
    expect(captureChangeSet([], "  make it pop  ").freeText).toBe("make it pop");
    expect(captureChangeSet([], "   ").freeText).toBeUndefined();
  });

  it("attaches a picked element target verbatim", () => {
    const target = {
      selector: '[data-section="hero"] h1',
      tag: "h1",
      text: "Marisol's",
      section: "hero",
    };
    expect(captureChangeSet([], "make this bigger", target).target).toEqual(target);
    expect(captureChangeSet([], "make it pop").target).toBeUndefined();
  });
});

describe("isHeavyRequest (light vs heavy boundary)", () => {
  it("keeps guided-only and small tweaks light", () => {
    expect(isHeavyRequest(captureChangeSet([opt("warmer"), opt("tighten_copy")]))).toBe(false);
    expect(isHeavyRequest(captureChangeSet([], "make the headline punchier"))).toBe(false);
  });

  it("keeps a server hint (auto-submit path) light when it's a simple tweak", () => {
    // The exact shape startIteration builds from a control-event hint.
    expect(isHeavyRequest(captureChangeSet([], "change the name to 'Emir's Cafe'"))).toBe(false);
  });

  it("flags new pages, integrations, and commerce as heavy", () => {
    expect(isHeavyRequest(captureChangeSet([], "can you add a booking page"))).toBe(true);
    expect(isHeavyRequest(captureChangeSet([], "we need online ordering / ecommerce"))).toBe(true);
    expect(isHeavyRequest(captureChangeSet([], "integrate with our CRM"))).toBe(true);
  });
});
