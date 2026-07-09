# @nutz/dashboard

The Phillip **backend + team dashboard**: a Next.js 16 app that serves the embed's entire API
(boot, LLM chat, iterations, checkout, analytics ingestion) and the UI the team runs the funnel
from. Persistence is **Turso/libsql via Drizzle** (`src/db/schema.ts`); the team signs in with
**better-auth** (email/password; every dashboard route is gated by `src/proxy.ts`).

```bash
cp .env.example .env.local        # fill in keys
pnpm db:push                      # create tables (file:.data/phillip.db locally, Turso in prod)
pnpm db:seed                      # demo leads + team login + settings  (-- --force to reseed)
pnpm embed                        # build the widget → public/phillip.js
pnpm dev                          # http://localhost:5174
```

## The API

Route handlers in `src/app/v1` (+ `src/app/api`). Three access tiers:

- **Embed-facing** (called cross-origin from lead sites; CORS `*`; the unguessable `prv_`/`ses_`
  id is the capability)
- **Key-gated** (server-to-server: build agents; send `x-api-key: $PHILLIP_API_KEY`)
- **Team** (better-auth session cookie; used by the dashboard UI)

| Method & path | Tier | Purpose |
| --- | --- | --- |
| `GET /v1/preview/:id/boot` | embed | Resolve a preview id → `BootConfig` (lead, persona, offer, engagement tuning, fresh session, resumed conversation) |
| `POST /v1/events` | embed | Ingest analytics batches; auto-advances funnel stage + engagement score |
| `POST /v1/conversations/:sessionId/messages` | embed | **SSE chat** — Phillip (Claude) streams the reply plus control frames (`intent`, `propose_quick_replies`, `start_iteration`, `escalate`, `open_checkout`) |
| `POST /v1/iterations` · `GET /v1/iterations/:id` | embed | Create / poll an iteration job (see below) |
| `POST /v1/escalations` | embed | Record a human-handoff request (email + reason) |
| `POST /v1/checkout` | embed | Create the Stripe Checkout session → `{ checkoutUrl }` |
| `POST /v1/previews` · `GET /v1/previews/:id` | key | **Auto mode**: register a generated site → `{ previewId, snippet, embedScriptUrl, leadId }`; attach `files` to enable automated iterations |
| `POST /v1/ingest/conversations/:sessionId/messages` | key | Push a finished transcript from an external agent |
| `GET /v1/leads` · `GET /v1/leads/:id` | team | Composite leads (the dashboard polls the list) |
| `GET /v1/export` (`?format=ndjson`) · `GET /v1/leads/:id/export` | team | **The agent feed** — every lead distilled into metrics + attention heatmap + synthesized brief |
| `POST /api/stripe/webhook` | Stripe | `checkout.session.completed` → order paid, stage `paid` (source of truth for payment) |

## Iterations (how a lead's "make it warmer" becomes a deploy)

`POST /v1/iterations` guards in order — over budget → `queued_manual/budget`; no site source →
`queued_manual/no_source` (the widget tells the lead the team is on it; the job appears in
**/iterations** for a human) — otherwise the executor (`src/lib/executor.ts`) runs after the
response: Claude applies the change set to the lead's `site_files` (tool loop, embed tag and
`data-section` markers pinned), the result deploys to the lead's Vercel project via the
deployments API (inline files, auto-creates the project on first deploy), the preview version
bumps, and the widget's poll flips to `done` with the fresh URL.

Per-lead spend (chat + iterations) lands in `usage_ledger`; the cap
(`PHILLIP_BUDGET_CAP_USD`, per-lead override on the lead row) gates further iterations and tells
Phillip to steer to checkout or the team instead.

## Analytics, heatmap & the agent feed

Derived in `src/lib/metrics.ts` (pure TS, shared by API + UI) from the embed's event stream:
session metrics (active time, scroll depth, section dwell, CTA/gallery/contact interactions),
the per-section **attention heatmap**, per-message **intent/sentiment**, and the synthesized
**agent brief** (requested changes, objections, winning/ignored sections, recommended actions).
`GET /v1/export` serves the whole book as JSON or NDJSON for downstream agents.

## Environment

See [`.env.example`](.env.example). In short: `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` (DB),
`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` (team auth), `ANTHROPIC_API_KEY` +
`PHILLIP_CHAT_MODEL`/`PHILLIP_EXECUTOR_MODEL` (the agent), `PHILLIP_BUDGET_CAP_USD`,
`PHILLIP_API_KEY` (auto-mode key), `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`,
`VERCEL_TOKEN`/`VERCEL_TEAM_ID` (iteration deploys + domain connect), `SEED_ADMIN_PASSWORD`.

`PHILLIP_DEPLOY_MODE=off` makes the executor apply + persist edits without deploying
(local testing without a Vercel token; the iteration says so via `statusReason`).

## Deploy (Vercel)

Project root directory `apps/dashboard`; the build script compiles the embed and copies it to
`public/phillip.js` automatically. Create the DB with `turso db create phillip`, set the env
vars, run `db:push`/`db:seed` locally against the Turso URL, and add the Stripe webhook
(`checkout.session.completed` → `/api/stripe/webhook`).
