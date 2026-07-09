# nutz · Phillip monorepo

Phillip turns a cold auto-generated website preview into a paying customer. Two things live here:

| Workspace | What it is |
| --- | --- |
| [`packages/phillip`](packages/phillip) | **The embed.** The `@nutz/phillip` client widget every generated preview carries — chat, engagement scoring, analytics capture, iteration requests, checkout. One `<script>` tag with a `data-preview-id` boots everything. |
| [`apps/dashboard`](apps/dashboard) | **The backend + team dashboard.** Next.js 16 app that serves the embed's entire API (boot, chat via Claude, iterations that really redeploy the site, Stripe checkout, analytics ingestion) and the team UI (funnel, deep per-lead analytics, iteration queue, settings). Turso/libsql via Drizzle; better-auth for the team login. |

The wire contract (records + event types) is defined once in `@nutz/phillip` and shared.

## The two ways a lead gets connected

**Manual** — in the dashboard press *New lead*, copy the snippet, paste it into the preview site:

```html
<script src="https://<dashboard-host>/phillip.js" data-preview-id="prv_…" defer></script>
```

**Auto** — the build agent registers the site it just generated and embeds the snippet from the response:

```bash
curl -X POST https://<dashboard-host>/v1/previews \
  -H "x-api-key: $PHILLIP_API_KEY" -H 'content-type: application/json' \
  -d '{"business":"Forge Barbers","industry":"barbershop",
       "files":[{"path":"index.html","content":"<html>…</html>"}]}'
# → { previewId, snippet, embedScriptUrl, leadId }
```

Attaching `files` (the site source) is what lets lead-requested iterations run automatically —
Claude edits the files and redeploys them to the lead's Vercel project. Leads registered without
source still work fully; their iteration requests land in the dashboard queue for the team.

## Develop

Requires pnpm (`corepack enable`) and Node >= 20.9.

```bash
pnpm install
cp apps/dashboard/.env.example apps/dashboard/.env.local   # fill in keys
pnpm --filter @nutz/dashboard db:push                      # create tables (local sqlite file)
pnpm --filter @nutz/dashboard db:seed                      # demo leads + team login + settings
pnpm embed                                                 # build the widget → public/phillip.js
pnpm dev:dashboard                                         # http://localhost:5174
pnpm dev                                                   # embed playground (MSW mock)
```

| Script | Does |
| --- | --- |
| `pnpm dev` | Phillip embed playground (`@nutz/phillip`) |
| `pnpm dev:dashboard` | Backend + dashboard (`@nutz/dashboard`, Next.js on :5174) |
| `pnpm embed` | Build the widget IIFE and copy it to the dashboard's `public/phillip.js` |
| `pnpm build` | Build every workspace |
| `pnpm test` / `pnpm typecheck` / `pnpm lint` | Vitest / tsc / Biome across workspaces |
| `pnpm size` | size-limit budgets on the built embed bundles |

## Deploy (Vercel)

Create a Vercel project with **Root Directory `apps/dashboard`**, add the env vars from
[`apps/dashboard/.env.example`](apps/dashboard/.env.example) (Turso URL + token, better-auth
secret/URL, Anthropic key, Stripe keys, Vercel token/team for iteration deploys, the preview API
key), then run `db:push` + `db:seed` once against the Turso URL. Point a Stripe webhook at
`https://<host>/api/stripe/webhook` (`checkout.session.completed`). Details + the full API table:
[`apps/dashboard/README.md`](apps/dashboard/README.md).
