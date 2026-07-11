import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../db/client";
import { assets } from "../db/schema";

// Uploaded attachments (a logo, etc.) are hosted here rather than sent to
// Claude as image bytes — the executor just tells the model a URL to
// reference in an <img> tag, which keeps the edit prompt small and avoids
// asking the model to reproduce base64 verbatim (slow, token-heavy, and
// unreliable).

const nowIso = () => new Date().toISOString();

const DATA_URL_RE = /^data:([^;]+);base64,(.+)$/;

// The table ships after the first production deploy of this feature — created
// lazily here (once per process) so a deploy path that skips the build-time
// migration script can't strand attachments against a missing table.
let ensured: Promise<unknown> | undefined;
function ensureTable(): Promise<unknown> {
  ensured ??= db.run(
    `CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      media_type TEXT NOT NULL,
      bytes_base64 TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
  );
  return ensured;
}

/** Decodes a `data:` URL and stores the raw bytes, returning a servable asset id. */
export async function storeAsset(dataUrl: string): Promise<string> {
  const match = dataUrl.match(DATA_URL_RE);
  if (!match) throw new Error("attachment must be a base64 data URL");
  await ensureTable();
  const [, mediaType, base64] = match;
  const id = `asset_${nanoid(16)}`;
  await db.insert(assets).values({
    id,
    mediaType: mediaType ?? "application/octet-stream",
    bytesBase64: base64 ?? "",
    createdAt: nowIso(),
  });
  return id;
}

export async function getAsset(id: string) {
  const [row] = await db.select().from(assets).where(eq(assets.id, id));
  return row;
}
