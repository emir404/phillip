import { afterEach, describe, expect, it, vi } from "vitest";
import type { ElementTarget } from "../types/records";
import { attachPicker, buildSelector } from "./picker";

// A synthetic same-origin "site" document, like the takeover's iframe doc.
function siteDoc(): Document {
  const doc = document.implementation.createHTMLDocument("site");
  doc.body.innerHTML = [
    '<section data-section="hero">',
    '  <h1 id="title">Marisol\'s</h1>',
    '  <div><button class="cta primary">book a table</button></div>',
    "</section>",
    "<ul><li>tacos</li><li>mole</li></ul>",
  ].join("\n");
  return doc;
}

function rect(left: number, top: number, width: number, height: number) {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON() {},
  } as DOMRect;
}

describe("buildSelector", () => {
  const doc = siteDoc();

  it("prefers an id", () => {
    const h1 = doc.querySelector("h1");
    if (!h1) throw new Error("fixture");
    expect(buildSelector(h1)).toBe("#title");
  });

  it("anchors under the generator's data-* hooks with semantic classes", () => {
    const btn = doc.querySelector("button");
    if (!btn) throw new Error("fixture");
    expect(buildSelector(btn)).toBe('[data-section="hero"] button.cta.primary');
  });

  it("returns the scope selector for the scope element itself", () => {
    const section = doc.querySelector("section");
    if (!section) throw new Error("fixture");
    expect(buildSelector(section)).toBe('[data-section="hero"]');
  });

  it("falls back to nth-of-type only for bare same-tag siblings", () => {
    const second = doc.querySelectorAll("li")[1];
    if (!second) throw new Error("fixture");
    expect(buildSelector(second)).toBe("ul li:nth-of-type(2)");
  });
});

describe("attachPicker", () => {
  let detach: (() => void) | null = null;
  afterEach(() => {
    detach?.();
    detach = null;
  });

  function arm(doc: Document) {
    const onPick = vi.fn<(t: ElementTarget) => void>();
    const onCancel = vi.fn();
    detach = attachPicker(doc, { onPick, onCancel });
    return { onPick, onCancel };
  }

  it("highlights the hovered element with a doc-absolute box and tag chip", () => {
    const doc = siteDoc();
    arm(doc);
    const btn = doc.querySelector<HTMLElement>("button");
    if (!btn) throw new Error("fixture");
    Object.defineProperty(btn, "getBoundingClientRect", { value: () => rect(10, 20, 100, 40) });

    btn.dispatchEvent(new Event("pointermove", { bubbles: true }));

    const box = doc.body.lastElementChild as HTMLElement;
    expect(box.style.display).toBe("block");
    expect(box.style.left).toBe("10px");
    expect(box.style.top).toBe("20px");
    expect(box.style.width).toBe("100px");
    expect(box.style.height).toBe("40px");
    expect(box.textContent).toBe("button");
    expect(doc.documentElement.style.cursor).toBe("crosshair");
  });

  it("captures the hovered element on click, swallowing the site's navigation", () => {
    const doc = siteDoc();
    const { onPick } = arm(doc);
    const btn = doc.querySelector<HTMLElement>("button");
    if (!btn) throw new Error("fixture");
    Object.defineProperty(btn, "getBoundingClientRect", { value: () => rect(10, 20, 100, 40) });
    btn.dispatchEvent(new Event("pointermove", { bubbles: true }));

    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    btn.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(onPick).toHaveBeenCalledWith({
      selector: '[data-section="hero"] button.cta.primary',
      tag: "button",
      text: "book a table",
      section: "hero",
    });
  });

  // A finger produces no pointermove before the click, so a pick that waited
  // for a hover would silently do nothing on a phone.
  it("captures a bare tap that never hovered first", () => {
    const doc = siteDoc();
    const { onPick } = arm(doc);
    const btn = doc.querySelector<HTMLElement>("button");
    if (!btn) throw new Error("fixture");
    Object.defineProperty(btn, "getBoundingClientRect", { value: () => rect(10, 20, 100, 40) });

    const tap = new MouseEvent("click", { bubbles: true, cancelable: true });
    btn.dispatchEvent(tap);

    expect(tap.defaultPrevented).toBe(true);
    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({ tag: "button", section: "hero" }),
    );
  });

  it("flashes the picked element so a touch pick is visible", () => {
    const doc = siteDoc();
    arm(doc);
    const btn = doc.querySelector<HTMLElement>("button");
    if (!btn) throw new Error("fixture");
    Object.defineProperty(btn, "getBoundingClientRect", { value: () => rect(10, 20, 100, 40) });
    const before = doc.body.childElementCount;

    btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(doc.body.childElementCount).toBe(before + 1);
    const ghost = doc.body.lastElementChild as HTMLElement;
    expect(ghost.style.left).toBe("10px");
    expect(ghost.style.height).toBe("40px");
  });

  it("cancels on Escape", () => {
    const doc = siteDoc();
    const { onCancel } = arm(doc);
    doc.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("detach removes the overlay, listeners, and cursor override", () => {
    const doc = siteDoc();
    const { onPick } = arm(doc);
    const before = doc.body.childElementCount;
    detach?.();
    detach = null;

    expect(doc.body.childElementCount).toBe(before - 1);
    expect(doc.documentElement.style.cursor).toBe("");
    const btn = doc.querySelector<HTMLElement>("button");
    btn?.dispatchEvent(new Event("pointermove", { bubbles: true }));
    btn?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(onPick).not.toHaveBeenCalled();
  });
});
