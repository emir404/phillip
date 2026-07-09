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

  it("derives apiBase from the script src origin when data-api-base is absent", () => {
    const s = document.createElement("script");
    s.setAttribute("data-preview-id", "prv_src");
    s.setAttribute("src", "https://api.nutz.inc/phillip.js?v=2");
    document.body.appendChild(s);
    expect(readScriptConfig().apiBase).toBe("https://api.nutz.inc");
  });

  it("prefers an explicit data-api-base over the script src", () => {
    const s = document.createElement("script");
    s.setAttribute("data-preview-id", "prv_both");
    s.setAttribute("data-api-base", "https://api.test");
    s.setAttribute("src", "https://cdn.example.com/phillip.js");
    document.body.appendChild(s);
    expect(readScriptConfig().apiBase).toBe("https://api.test");
  });

  it("leaves apiBase undefined when the script has no usable src", () => {
    const noSrc = document.createElement("script");
    noSrc.setAttribute("data-preview-id", "prv_nosrc");
    document.body.appendChild(noSrc);
    expect(readScriptConfig().apiBase).toBeUndefined();
    noSrc.remove();

    // A relative src can't name a backend origin — same-origin default applies.
    const relative = document.createElement("script");
    relative.setAttribute("data-preview-id", "prv_rel");
    relative.setAttribute("src", "/phillip.js");
    document.body.appendChild(relative);
    expect(readScriptConfig().apiBase).toBeUndefined();
  });
});
