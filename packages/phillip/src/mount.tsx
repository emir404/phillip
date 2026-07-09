import { type Root, createRoot } from "react-dom/client";
import { PhillipWidget } from "./PhillipWidget";
import { type RuntimeConfig, debugFromLocation, defaultApiBase } from "./core/config";
import { tailwindStyles } from "./elements/tailwind.generated";
import { setDebug } from "./lib/log";
import { styles } from "./styles";
import { TransportClient } from "./transport/client";
import type { FetchLike } from "./transport/rest";

export interface MountOptions {
  previewId: string;
  /** Backend origin. Defaults to same-origin; the client appends `/v1`. */
  apiBase?: string;
  debug?: boolean;
  /** Injectable fetch — used by tests; production uses the global. */
  fetch?: FetchLike;
  /** Where to attach the host element. Defaults to document.body. */
  target?: HTMLElement;
}

function applyStyles(shadow: ShadowRoot): void {
  // Legacy handwritten CSS first, then the compiled Tailwind layer (vendored
  // elements) so utilities win ties against same-specificity legacy rules.
  const css = `${styles}\n${tailwindStyles}`;
  // Preferred: a constructable stylesheet adopted by the shadow root (zero DOM,
  // no flash). Falls back to an injected <style> for older Safari / happy-dom.
  try {
    const Ctor = globalThis.CSSStyleSheet;
    if (Ctor && "adoptedStyleSheets" in shadow) {
      const sheet = new Ctor();
      sheet.replaceSync(css);
      shadow.adoptedStyleSheets = [sheet];
      return;
    }
  } catch {
    // fall through to <style>
  }
  const el = document.createElement("style");
  el.textContent = css;
  shadow.appendChild(el);
}

/**
 * Set CSS custom properties on an element — the widget calls this to push
 * backend-driven theme tokens (brand colors etc.) onto the shadow tree's root.
 * Non-custom-property keys are ignored so callers can't inject arbitrary
 * inline styles through a themed config payload.
 */
export function applyThemeVars(el: HTMLElement, vars: Record<string, string>): void {
  for (const [key, value] of Object.entries(vars)) {
    if (key.startsWith("--")) el.style.setProperty(key, value);
  }
}

/**
 * Inject Phillip into the page. Creates a shadow-rooted host (so host-site CSS
 * can't leak in or out) and renders the React root *inside* the shadow — never
 * portaling from light DOM, which would retarget React's synthetic events.
 * Returns a disposer that fully removes the widget.
 */
/**
 * True when this document is the widget's own site-preview iframe (the
 * takeover's left pane). The widget must never boot in there — it would
 * recurse. `window.name` survives cross-origin loads, so the guard holds no
 * matter where a result URL points.
 */
export function isInsidePhillipFrame(win: Window = window): boolean {
  try {
    return win.self !== win.top && win.name === "phillip-preview";
  } catch {
    return false;
  }
}

export function mount(opts: MountOptions): () => void {
  if (isInsidePhillipFrame()) {
    return () => {};
  }
  const debug = Boolean(opts.debug) || debugFromLocation();
  if (debug) setDebug(true);

  const host = document.createElement("div");
  host.setAttribute("data-phillip-host", "");
  (opts.target ?? document.body).appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  applyStyles(shadow);

  const inner = document.createElement("div");
  inner.className = "phillip-root";
  shadow.appendChild(inner);

  const runtime: RuntimeConfig = {
    previewId: opts.previewId,
    apiBase: opts.apiBase ?? defaultApiBase(),
    debug,
  };
  const client = new TransportClient({ apiBase: runtime.apiBase, fetch: opts.fetch });

  let root: Root | null = createRoot(inner);
  root.render(<PhillipWidget runtime={runtime} client={client} />);

  return () => {
    const r = root;
    root = null;
    // Defer: when <Phillip/> unmounts, this runs inside the host tree's commit.
    // Unmounting the inner root synchronously there races React; a microtask
    // lets the current commit finish first.
    queueMicrotask(() => {
      r?.unmount();
      host.remove();
    });
  };
}
