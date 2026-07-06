# @nutz/dashboard

The nutz team's analytics **app + ingestion backend** for Phillip, built with
**Next.js** (App Router). Agents `POST` lead, event, and conversation data to its
API; it **persists** them and renders the funnel, engagement, and full
conversations in real time.

It reads the **same record and event types the embed emits** (imported as types
from [`@nutz/phillip`](../../packages/phillip)), so the wire contract is defined
once and the two stay in lock-step.

```bash
pnpm --filter @nutz/dashboard dev     # dev server on http://localhost:5174
# or from the repo root:
pnpm dev:dashboard
```

## The backend / API

All endpoints live under `/v1` (route handlers in `src/app/v1`). The store
(`src/lib/store.ts`) persists everything.

| Method & path | Purpose | Body |
| --- | --- | --- |
| `GET /v1/leads` | All leads (the dashboard polls this) | — |
| `GET /v1/leads/:id` | One lead (composite) | — |
| `POST /v1/leads` | Register / update a lead + preview + session | `{ lead, session, preview?, engagementScore? }` |
| `POST /v1/events` | Ingest a batch of analytics/funnel events | `{ sessionId, events: AnalyticsEvent[] }` |
| `POST /v1/conversations/:sessionId/messages` | Append conversation messages | `{ messages: Message[], intent?, sentiment? }` |

`POST /v1/events` uses the **exact shape the embed already sends**
(`EventsBatchRequest`), so pointing a live embed's `data-api-base` at this deploy
persists its behaviour stream. Ingested events advance the lead's funnel stage
and engagement score automatically. If events arrive for an unknown session, a
placeholder lead is created so nothing is dropped.

Quick check:

```bash
curl -X POST localhost:5174/v1/events -H 'content-type: application/json' \
  -d '{"sessionId":"ses_1","events":[{"id":"e1","sessionId":"ses_1","type":"ping_shown","payload":{"reason":"score","score":80},"ts":"2026-07-06T00:00:00Z"}]}'
```

## Data & persistence

- The store keeps everything in memory (fast reads) and **write-through-persists
  to a JSON file** (`.data/phillip.json` by default; set `PHILLIP_DATA_FILE` to
  relocate — e.g. a mounted volume). A fresh deploy is **seeded** with sample
  leads (`src/lib/seed-data.ts`) so it shows data immediately.
- If the filesystem isn't writable (some serverless runtimes), it degrades to
  memory-only — the API still works, it just won't persist across cold starts.
- `src/lib/store.ts` is the single seam: swap it for Postgres/Prisma (or any DB)
  without touching the UI or API handlers.

## Deploy

**Any Node host / container (persistent disk — recommended):**

```bash
docker build -t phillip-dashboard .            # from the repo root
docker run -p 5174:5174 -v phillip-data:/data phillip-dashboard
```

Or without Docker, on a VM/Render/Railway/Fly:

```bash
pnpm install && pnpm --filter @nutz/dashboard build
PHILLIP_DATA_FILE=/var/lib/phillip/phillip.json pnpm --filter @nutz/dashboard start
```

**Vercel / serverless:** deploys as-is and the API runs, but the filesystem is
ephemeral, so for durable storage point the store at a hosted DB (swap
`src/lib/store.ts`). Everything else works unchanged.

## UI

KPIs, a conversion funnel with step-to-step rates, the leads table, and a
lead-detail drawer (engagement gauge, session context, transcript, event
timeline). Server-rendered from the store on first paint, then kept live by
polling `/v1/leads`. Motion uses the same "seamless" language as the embed —
every element enters with blur + opacity + position and everything staggers
(`src/motion.ts`).
