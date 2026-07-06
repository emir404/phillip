// Runtime config the embed boots with — distinct from the BootConfig it then
// fetches. This is just enough to find the backend and identify the preview.

export interface RuntimeConfig {
  previewId: string;
  apiBase: string;
  debug: boolean;
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
    apiBase: el.dataset.apiBase,
    debug: el.dataset.debug != null,
  };
}
