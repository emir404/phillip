import { describe, expect, it } from "vitest";
import { readAttachment } from "./attachments";

// Only the non-image path is exercised here — image downscaling goes through
// canvas + Image decoding, which jsdom doesn't actually implement (no real
// rendering backend), so that path is verified manually in a real browser.
describe("readAttachment", () => {
  it("reads a small non-image file as a data URL, untouched", async () => {
    const file = new File(["hello world"], "notes.txt", { type: "text/plain" });
    const attachment = await readAttachment(file);
    expect(attachment.name).toBe("notes.txt");
    expect(attachment.mediaType).toBe("text/plain");
    expect(attachment.dataUrl).toMatch(/^data:text\/plain;base64,/);
  });

  it("rejects a file over the size cap", async () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024)], "big.pdf", {
      type: "application/pdf",
    });
    await expect(readAttachment(big)).rejects.toThrow(/too large/i);
  });
});
