import type { ElementTarget } from "../types/records";

// The takeover's element picker: devtools-inspector UX injected straight into
// the same-origin preview iframe (no postMessage — we own both sides). While
// armed, hovering highlights the element under the cursor; a click captures a
// compact descriptor for the change-set and disarms. Everything the picker
// adds to the framed document is removed by the returned detach.

export interface PickerHandlers {
  onPick: (target: ElementTarget) => void;
  onCancel: () => void;
}

const SCOPE_ATTRS = ["data-section", "data-cta", "data-gallery", "data-contact"] as const;
const SCOPES = SCOPE_ATTRS.map((a) => `[${a}]`).join(",");

const esc = (s: string): string =>
  typeof CSS !== "undefined" && typeof CSS.escape === "function"
    ? CSS.escape(s)
    : s.replace(/[^\w-]/g, "\\$&");

/** Semantic-looking classes only — utility soup and state hashes stay out. */
const pickClasses = (el: Element): string[] =>
  [...el.classList].filter((c) => /^[a-z][\w-]{2,}$/i.test(c) && !c.includes(":")).slice(0, 2);

const step = (el: Element): string => {
  const tag = el.tagName.toLowerCase();
  const cls = pickClasses(el)
    .map((c) => `.${esc(c)}`)
    .join("");
  if (cls) return tag + cls;
  const siblings = el.parentElement
    ? [...el.parentElement.children].filter((s) => s.tagName === el.tagName)
    : [];
  return siblings.length > 1 ? `${tag}:nth-of-type(${siblings.indexOf(el) + 1})` : tag;
};

const scopeSelector = (scope: Element): string => {
  for (const attr of SCOPE_ATTRS) {
    const value = scope.getAttribute(attr);
    if (value != null) return `[${attr}="${value}"]`;
  }
  return scope.tagName.toLowerCase();
};

/** A short, readable selector the Build agent can grep in the raw site files:
 *  `#id` beats everything; otherwise anchor under the generator's stable
 *  data-* hooks and keep the chain ≤3 steps. */
export function buildSelector(el: Element, maxDepth = 3): string {
  if (el.id) return `#${esc(el.id)}`;
  const scope = el.closest(SCOPES);
  const prefix = scope ? scopeSelector(scope) : "";
  if (scope === el) return prefix;
  const path: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== scope && cur.tagName !== "BODY" && path.length < maxDepth) {
    path.unshift(step(cur));
    if (cur.id || pickClasses(cur).length) break; // anchored enough — stop climbing
    cur = cur.parentElement;
  }
  return [prefix, ...path].filter(Boolean).join(" ");
}

function describe(el: Element): ElementTarget {
  const leafText =
    el.children.length === 0 ? el.textContent?.trim().slice(0, 60) || undefined : undefined;
  return {
    selector: buildSelector(el),
    tag: el.tagName.toLowerCase(),
    text: leafText,
    section: el.closest("[data-section]")?.getAttribute("data-section") ?? undefined,
  };
}

export function attachPicker(doc: Document, handlers: PickerHandlers): () => void {
  const win = doc.defaultView; // null under createHTMLDocument (unit tests)
  const box = doc.createElement("div");
  const chip = doc.createElement("div");
  box.style.cssText =
    "position:absolute;z-index:2147483646;pointer-events:none;display:none;" +
    "border:1.5px solid #0088ff;background:rgba(0,136,255,.12);border-radius:3px;" +
    "box-sizing:border-box";
  chip.style.cssText =
    "position:absolute;left:-1.5px;top:-22px;padding:2px 6px;border-radius:4px;" +
    "font:11px/1.4 system-ui,sans-serif;color:#fff;background:#0088ff;white-space:nowrap";
  box.appendChild(chip);
  doc.body.appendChild(box);
  const prevCursor = doc.documentElement.style.cursor;
  doc.documentElement.style.cursor = "crosshair";

  let hovered: Element | null = null;

  /** Anything that isn't the page itself, or our own highlight. */
  const pickable = (el: EventTarget | null): Element | null => {
    if (!(el instanceof Element)) return null;
    if (el === box || box.contains(el) || el === doc.documentElement || el === doc.body)
      return null;
    return el;
  };

  const place = (el: Element) => {
    const r = el.getBoundingClientRect();
    box.style.display = "block";
    box.style.left = `${r.left + (win?.scrollX ?? 0)}px`;
    box.style.top = `${r.top + (win?.scrollY ?? 0)}px`;
    box.style.width = `${r.width}px`;
    box.style.height = `${r.height}px`;
    chip.textContent = el.tagName.toLowerCase() + (el.id ? `#${el.id}` : "");
  };

  /**
   * A finger has no hover, so a tap gets no highlight before it lands. Leave
   * the box behind for a beat, detached from the picker's lifetime, so the
   * lead sees exactly which element they hit.
   */
  const flash = (el: Element) => {
    const r = el.getBoundingClientRect();
    const ghost = doc.createElement("div");
    ghost.style.cssText =
      "position:absolute;z-index:2147483646;pointer-events:none;" +
      "border:1.5px solid #0088ff;background:rgba(0,136,255,.12);border-radius:3px;" +
      "box-sizing:border-box;transition:opacity .2s ease";
    ghost.style.left = `${r.left + (win?.scrollX ?? 0)}px`;
    ghost.style.top = `${r.top + (win?.scrollY ?? 0)}px`;
    ghost.style.width = `${r.width}px`;
    ghost.style.height = `${r.height}px`;
    doc.body.appendChild(ghost);
    // `win` is null for a detached document (unit tests) — the global timer
    // still runs, so the ghost is always cleaned up.
    const timer = win?.setTimeout ? win.setTimeout.bind(win) : setTimeout;
    timer(() => {
      ghost.style.opacity = "0";
    }, 20);
    timer(() => ghost.remove(), 260);
  };

  // Pointer events cover mouse, pen, and the touch that precedes a tap.
  const onMove = (e: Event) => {
    const el = pickable(e.target);
    if (!el) return;
    hovered = el;
    place(el);
  };
  const onClick = (e: MouseEvent) => {
    // Capture phase + full stop: a pick must never follow the site's links.
    e.preventDefault();
    e.stopImmediatePropagation();
    // A tap may arrive with no pointermove before it — trust the click's own
    // target first, and only fall back to whatever the mouse last hovered.
    const el = pickable(e.target) ?? hovered;
    if (!el) return;
    flash(el);
    handlers.onPick(describe(el));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") handlers.onCancel();
  };
  const onScroll = () => {
    if (hovered) place(hovered);
  };
  const onLeave = () => {
    hovered = null;
    box.style.display = "none";
  };

  doc.addEventListener("pointermove", onMove, true);
  doc.addEventListener("click", onClick, true);
  doc.addEventListener("keydown", onKey, true);
  doc.addEventListener("scroll", onScroll, true);
  doc.documentElement.addEventListener("mouseleave", onLeave);
  doc.documentElement.addEventListener("pointerleave", onLeave);

  return () => {
    doc.removeEventListener("pointermove", onMove, true);
    doc.removeEventListener("click", onClick, true);
    doc.removeEventListener("keydown", onKey, true);
    doc.removeEventListener("scroll", onScroll, true);
    doc.documentElement.removeEventListener("mouseleave", onLeave);
    doc.documentElement.removeEventListener("pointerleave", onLeave);
    box.remove();
    doc.documentElement.style.cursor = prevCursor;
  };
}
