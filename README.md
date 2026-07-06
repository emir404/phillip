# nutz · Phillip monorepo

Two things live here:

| Workspace | What it is |
| --- | --- |
| [`packages/phillip`](packages/phillip) | **The embed.** The `@nutz/phillip` client widget the Build agent drops into every generated preview — this is the script we publish to our CDN/storage to install Phillip and his content onto any site. |
| [`apps/dashboard`](apps/dashboard) | **The dashboard + backend.** A **Next.js** app for the team to watch every lead move through the funnel, read their engagement signals, and open the full conversation. Its `/v1` API is where agents `POST` lead, event, and conversation data — it persists them and renders them live. |

The dashboard reads (and ingests) the **same records and event types** the embed emits (`@nutz/phillip`), so the wire contract is defined once and shared across both.

## Layout

```
.
├─ package.json            workspace root (private) — orchestration scripts
├─ pnpm-workspace.yaml     packages/* + apps/*
├─ biome.json              shared lint/format config
├─ packages/
│  └─ phillip/             the @nutz/phillip embed (widget, mock backend, playground)
└─ apps/
   └─ dashboard/           the @nutz/dashboard analytics app
```

## Develop

Requires pnpm (`corepack enable` gives you the pinned version) and Node >=18.

```bash
pnpm install            # install every workspace at once
pnpm dev                # the embed playground (fake site + Phillip, MSW mock)
pnpm dev:dashboard      # the analytics dashboard
```

| Script | Does |
| --- | --- |
| `pnpm dev` | Phillip embed playground (`@nutz/phillip`) |
| `pnpm dev:dashboard` | Analytics dashboard + backend (`@nutz/dashboard`, Next.js on :5174) |
| `pnpm build` | Build every workspace |
| `pnpm build:phillip` / `pnpm build:dashboard` | Build one workspace |
| `pnpm test` | Run tests across workspaces (Vitest) |
| `pnpm typecheck` | `tsc --noEmit` across workspaces |
| `pnpm lint` / `pnpm format` | Biome (shared config) |
| `pnpm size` | size-limit budgets on the built embed bundles |

## Deploy the dashboard

The dashboard is deploy-and-run. On any Node host / container (with a persistent
disk for the store):

```bash
docker build -t phillip-dashboard .            # uses the root Dockerfile
docker run -p 5174:5174 -v phillip-data:/data phillip-dashboard
```

It seeds sample data on first boot and persists everything agents `POST` to its
`/v1` API. See [`apps/dashboard/README.md`](apps/dashboard/README.md) for the API
contract, the `PHILLIP_DATA_FILE` setting, and the serverless note.

See each workspace's own README for details:

- [`packages/phillip/README.md`](packages/phillip/README.md)
- [`apps/dashboard/README.md`](apps/dashboard/README.md)
