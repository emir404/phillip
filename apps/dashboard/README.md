# @nutz/dashboard

The nutz team's analytics dashboard for **Phillip**. It shows every lead the
embed is working: where they are in the funnel, how engaged they are, the full
event stream, and the conversation Phillip had with them.

It reads the **same record and event types the embed emits** (imported as types
from [`@nutz/phillip`](../../packages/phillip)), so the two stay in lock-step —
the wire contract is defined once.

```bash
pnpm --filter @nutz/dashboard dev   # or, from the repo root: pnpm dev:dashboard
```

## What's here

- **KPIs** — leads, engaged %, paid, revenue, average engagement score.
- **Funnel** — `opened → engaged → reacted → checkout → paid → live`, with
  step-to-step conversion.
- **Leads** — the full pipeline; click a lead to open its detail drawer.
- **Lead detail** — session context, an engagement-score gauge, the conversation
  transcript, and a timeline of every tracked signal.

## Notes

- **Data** is a realistic in-repo sample (`src/data/sample.ts`) typed with the
  shared records. Wiring it to a real backend means swapping that module for a
  fetch of the same shapes.
- **Motion** uses the same "seamless" language as the embed — every element
  enters with blur + opacity + position and everything staggers
  (`src/motion.ts`).
- Only *types* are imported from `@nutz/phillip`, so nothing from the embed
  bundle ships in the dashboard.
