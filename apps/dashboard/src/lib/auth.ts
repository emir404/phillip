import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as authSchema from "../db/auth-schema";
import { db } from "../db/client";

// Better-auth only trusts the exact BETTER_AUTH_URL origin by default, which
// rejects sign-ins from 127.0.0.1 in dev and from Vercel's per-deployment
// preview URLs. Trust those explicitly; VERCEL_URL / the production URL are
// system env vars Vercel injects at runtime.
const trustedOrigins = [
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  process.env.VERCEL_PROJECT_PRODUCTION_URL &&
    `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
].filter((origin): origin is string => Boolean(origin));

// Team-only auth: email/password for the two founders. Leads never log in —
// their preview id is the capability.
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite", schema: authSchema }),
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins,
});
