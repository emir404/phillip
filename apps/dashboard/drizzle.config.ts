import { defineConfig } from "drizzle-kit";

// Local dev uses a plain sqlite file under .data/ (gitignored); production
// points at Turso. Both go through the libsql driver, so `db:push` works
// against either — just swap the env vars.
export default defineConfig({
  dialect: "turso",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? "file:.data/phillip.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
