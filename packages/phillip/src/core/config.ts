// Runtime config the embed boots with — distinct from the BootConfig it then
// fetches. This is just enough to find the backend and identify the preview.

export interface RuntimeConfig {
  previewId: string;
  apiBase: string;
  debug: boolean;
  /** The lead just backed out of Stripe checkout — greet them accordingly. */
  checkoutCancelled?: boolean;
}

/** Same-origin by default; the client appends `/v1`. */
export function defaultApiBase(): string {
  return "";
}

export function debugFromLocation(): boolean {
  try {
    return globalThis.location?.search?.includes("phillip_debug") ?? false;
  } catch {
    return false;
  }
}

export interface ScriptConfig {
  previewId?: string;
  apiBase?: string;
  debug?: boolean;
}

/** Read config off the drop-in <script> tag for the non-React entry. */
export function readScriptConfig(): ScriptConfig {
  const el =
    (document.currentScript as HTMLScriptElement | null) ??
    document.querySelector<HTMLScriptElement>("script[data-preview-id]");
  if (!el) return {};
  return {
    previewId: el.dataset.previewId,
    // Explicit data-api-base wins; otherwise the origin that served phillip.js
    // is the backend, so the hosted script tag needs zero extra configuration.
    apiBase: el.dataset.apiBase ?? scriptSrcOrigin(el),
    debug: el.dataset.debug != null,
  };
}

/**
 * Origin of the script's own absolute `src`. Reads the raw attribute (not the
 * resolved `el.src`) so a relative or empty src stays undefined — which falls
 * through to the same-origin default rather than pinning the page's origin.
 */
function scriptSrcOrigin(el: HTMLScriptElement): string | undefined {
  const src = el.getAttribute("src");
  if (!src) return undefined;
  try {
    return new URL(src).origin;
  } catch {
    return undefined;
  }
}
