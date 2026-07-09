// Standalone drop-in entry (built as the IIFE `preview.js`). Reads the
// previewId off its own <script> tag and auto-mounts. Exposes `window.Phillip`
// for manual control too.

import { readScriptConfig } from "./core/config";
import { log } from "./lib/log";
import { type MountOptions, isInsidePhillipFrame, mount } from "./mount";

function autoMount(): void {
  // The takeover frames the site in an iframe of itself — never boot in there.
  if (isInsidePhillipFrame()) return;
  const cfg = readScriptConfig();
  if (!cfg.previewId) {
    log.warn("no data-preview-id on the script tag; not mounting");
    return;
  }
  mount({ previewId: cfg.previewId, apiBase: cfg.apiBase, debug: cfg.debug });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoMount, { once: true });
  } else {
    autoMount();
  }
}

export { mount };
export type { MountOptions };
