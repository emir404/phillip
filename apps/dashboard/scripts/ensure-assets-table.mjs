// Creates the assets table (lead-uploaded attachment bytes) if it doesn't
// exist yet. Runs during the Vercel build — the only place the Turso
// credentials are available — because `db:push` is a manual, interactive
// step and this one additive table shouldn't block a deploy on it.
// Idempotent by construction; safe to keep in the build.
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL ?? "file:.data/phillip.db";
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

const client = createClient({ url, authToken });
await client.execute(`
  CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    media_type TEXT NOT NULL,
    bytes_base64 TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);
console.log(`ensure-assets-table: ok (${url.startsWith("file:") ? "local sqlite" : "turso"})`);
client.close();
