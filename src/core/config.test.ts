import { afterEach, describe, expect, it } from "vitest";
import { readScriptConfig } from "./config";

afterEach(() => {
  for (const s of document.querySelectorAll("script[data-preview-id]")) s.remove();
});

describe("readScriptConfig (drop-in)", () => {
  it("reads previewId, apiBase, and debug off the script tag", () => {
    const s = document.createElement("script");
    s.setAttribute("data-preview-id", "prv_x");
    s.setAttribute("data-api-base", "https://api.test");
    s.setAttribute("data-debug", "");
    document.body.appendChild(s);

    const cfg = readScriptConfig();
    expect(cfg.previewId).toBe("prv_x");
    expect(cfg.apiBase).toBe("https://api.test");
    expect(cfg.debug).toBe(true);
  });

  it("treats a missing data-debug as not-debug", () => {
    const s = document.createElement("script");
    s.setAttribute("data-preview-id", "prv_y");
    document.body.appendChild(s);
    expect(readScriptConfig().debug).toBe(false);
  });

  it("returns empty when there is no script tag", () => {
    expect(readScriptConfig().previewId).toBeUndefined();
  });
});
