import { describe, expect, it } from "vitest";
import { SHEET_PEEK_H, captureRect, railEnter, railExit, railFinalRect, sheetRect } from "./morph";

describe("takeover morph", () => {
  it("computes the desktop rail slot (16px inset, 400 wide)", () => {
    expect(railFinalRect(1440, 900)).toEqual({ left: 1024, top: 16, width: 400, height: 868 });
  });

  it("becomes a peeking bottom sheet under 768", () => {
    expect(railFinalRect(390, 844)).toEqual({ left: 0, top: 620, width: 390, height: 224 });
  });

  it("sheetRect peeks at SHEET_PEEK_H and expands to 70% of the viewport", () => {
    expect(sheetRect(390, 844, false)).toEqual({
      left: 0,
      top: 844 - SHEET_PEEK_H,
      width: 390,
      height: SHEET_PEEK_H,
    });
    expect(sheetRect(390, 844, true)).toEqual({ left: 0, top: 253, width: 390, height: 591 });
  });

  it("captureRect returns null for unmeasurable elements (jsdom)", () => {
    const el = document.createElement("div");
    expect(captureRect(el)).toBeNull();
    expect(captureRect(null)).toBeNull();
  });

  it("morph enter starts at the stage box and lands on the final slot", () => {
    const stage = { left: 1004, top: 400, width: 420, height: 484 };
    const final = railFinalRect(1440, 900);
    const { initial, animate } = railEnter(stage, final, false);
    expect(initial).toMatchObject({ x: -20, y: 384, width: 420, height: 484 });
    expect(animate).toMatchObject({ x: 0, y: 0, width: 400, height: 868 });
  });

  it("falls back to a slide-in without a stage rect and to fades under reduced motion", () => {
    const final = railFinalRect(1440, 900);
    expect(railEnter(null, final, false).initial).toMatchObject({ opacity: 0, x: 24 });
    expect(railEnter(null, final, true).initial).toEqual({ opacity: 0, x: 0 });
    expect(railExit(undefined, final)).toMatchObject({ opacity: 0 });
    expect(railExit({ stageRect: null, toIteration: false, reduce: false }, final)).toMatchObject({
      opacity: 0,
    });
  });

  it("morph exit glides back to the stage box", () => {
    const stage = { left: 1004, top: 400, width: 420, height: 484 };
    const final = railFinalRect(1440, 900);
    expect(railExit({ stageRect: stage, toIteration: false, reduce: false }, final)).toMatchObject({
      x: -20,
      y: 384,
      width: 420,
      height: 484,
      opacity: 0,
    });
  });
});
