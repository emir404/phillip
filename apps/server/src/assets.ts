import { prefixedId } from "./id";

// Uploaded attachments (a logo, etc.) are hosted here rather than sent to
// Claude as image bytes — reviseSite just tells the model a URL to reference
// in an <img> tag, which keeps the edit prompt small and avoids asking the
// model to reproduce base64 verbatim (slow, token-heavy, and unreliable).

interface StoredAsset {
  mediaType: string;
  bytes: Buffer;
}

const assets = new Map<string, StoredAsset>();

const DATA_URL_RE = /^data:([^;]+);base64,(.+)$/;

/** Decodes a data: URL and stores the raw bytes, returning a servable asset id. */
export function storeAsset(dataUrl: string): string {
  const match = dataUrl.match(DATA_URL_RE);
  if (!match) throw new Error("attachment must be a base64 data URL");
  const [, mediaType, base64] = match;
  const id = prefixedId("asset");
  assets.set(id, {
    mediaType: mediaType ?? "application/octet-stream",
    bytes: Buffer.from(base64 ?? "", "base64"),
  });
  return id;
}

export function getAsset(id: string): StoredAsset | undefined {
  return assets.get(id);
}
