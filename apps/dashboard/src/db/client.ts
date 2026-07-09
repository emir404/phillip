import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

// One libsql connection per process, stashed on globalThis so Next dev HMR
// doesn't open a new client on every reload (same pattern the old JSON store
// used). Local dev runs against a plain sqlite file under .data/; production
// points TURSO_DATABASE_URL at Turso.

const GLOBAL_KEY = "__phillip_db__";

function makeDb() {
  const url = process.env.TURSO_DATABASE_URL ?? "file:.data/phillip.db";
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
  return drizzle(createClient({ url, authToken }));
}

type Db = ReturnType<typeof makeDb>;

function instance(): Db {
  const g = globalThis as unknown as Record<string, Db | undefined>;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = makeDb();
  return g[GLOBAL_KEY] as Db;
}

export const db = instance();
