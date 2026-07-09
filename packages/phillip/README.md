# @nutz/phillip

**The autonomous preview-to-paid embed.**

nutz scouts a business, auto-builds them a website, and sends a link. **Phillip**
is the layer that turns that cold preview into a paying customer with no human in
the loop: he watches how the lead behaves, opens a chat in the bottom-right
wearing our salesperson's face, handles feedback, iterates on the site, takes
payment, and runs setup.

This package is *the embed* — a deliberately dumb client widget the Build agent
drops into every preview. It boots with a single `previewId` and pulls everything
else (persona, offer, state, Stripe keys) from the backend at runtime, so secrets
never touch the page and the offer/script/persona can change without redeploying
any site.

> The loop: **Land → Engage → React → Iterate or escalate → Pay → Set up**

---

## Install

```bash
npm i @nutz/phillip   # or pnpm / yarn
```

`react` and `react-dom` (>=18.2) are peer dependencies.

### Drop-in (any site)

One tag, no build step — React is bundled into this entry:

```html
<script
  src="https://cdn.jsdelivr.net/npm/@nutz/phillip/preview.js"
  data-preview-id="prv_8f2a"
  defer
></script>
```

| Attribute | Required | Meaning |
| --- | --- | --- |
| `data-preview-id` | yes | The preview this page belongs to — the only credential the page carries. |
| `data-api-base` | no | Backend origin. Defaults to the origin that served the script. |
| `data-debug` | no | Verbose console logging (`?phillip_debug` in the URL does the same). |

### Next.js (App Router)

```tsx
// app/layout.tsx
import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="https://your-dashboard.example.com/phillip.js"
          data-preview-id="prv_8f2a"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
```

`afterInteractive` is the right strategy: the widget is an overlay, so it must
not block hydration.

### React

```tsx
"use client";
import { Phillip } from "@nutz/phillip";

export function SiteAgent() {
  return <Phillip previewId="prv_8f2a" />;
}
```

The component renders `null` and mounts itself into a shadow root from an
effect, so it is inert during SSR — but it *is* a client component. There is
also an imperative `mount({ previewId })` that returns a disposer.

`<PreviewAgent>` is exported as a back-compat alias for `<Phillip>`.

### Once the lead pays

The widget stops mounting: the boot response goes silent for a paid lead, and a
visitor arriving back from Stripe (`?phillip=paid`) is never shown a chat bubble
again. Nothing to uninstall.

---

## How it works

The embed renders into a **shadow root** so host-site CSS can't leak in or out.
On mount it does one request — `GET {apiBase}/v1/preview/:id/boot` — and gets back
a `BootConfig` (lead, persona, offer, engagement weights, feature flags, resumed
conversation). Everything downstream is driven by that payload.

- **Silent analytics** track scroll depth, per-section dwell, clicks, CTA hovers,
  gallery/video/contact interactions, and active time, feeding a **weighted
  engagement score**. When it crosses the threshold (or exit-intent / a fallback
  timer fires), Phillip pings. A periodic `signals_snapshot` event ships the
  consolidated picture (active time, scroll, per-section dwell = the heatmap, and
  all signal counts) to the backend on every flush and on page hide — that's the
  raw data the [dashboard](../../apps/dashboard) turns into the **agent feed**.
- **Streaming chat** — messages POST to the backend and the reply streams back
  over SSE (fetch + `ReadableStream`), so it types in real time.
- **Light iteration** — small asks (copy, palette, photo swaps, hours) become a
  change-set, go to the Build agent, and the preview is swapped. Bigger asks or
  too many rounds hand off.

- **Mobile first** — most leads open their preview on a phone. The chat sizes
  itself to the viewport and rides above the keyboard; the iteration takeover
  puts the site full-screen behind a bottom sheet you tap up to talk.

### What's built vs stubbed

The loop runs end to end: Landing → Ping → Reaction → Light iteration →
**Checkout** → Paid, plus analytics and the funnel (`delivered → opened →
engaged → reacted → iterating/escalated → checkout → paid → live`). Checkout is
real Stripe (hosted Checkout, live and test mode per lead); the funnel only ever
advances to `paid` on a signed webhook, never from the client.

**Escalation (05) and Setup (07) remain typed stubs** with minimal reachable UI —
clean interfaces in `src/stubs/` ready to wire to the Email agent and
provisioning.

---

## Develop

```bash
pnpm install
pnpm dev        # Vite playground: a fake generated site + Phillip, backed by an
                # in-browser MSW mock — the whole flow runs with no real services
```

| Script | Does |
| --- | --- |
| `pnpm dev` | Run the playground against the MSW mock |
| `pnpm build` | Dual build via tsup: React entry (ESM/CJS) + drop-in IIFE |
| `pnpm test` | Vitest (jsdom + MSW) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` / `pnpm format` | Biome |
| `pnpm size` | size-limit budgets on the built bundles |

The mock backend (`mock/`) implements the same wire contract the real nutz.inc
backend will implement, and the **same handlers run in the tests** — so the
contract is defined once.

---

## Architecture

```
src/
  index.ts / preview.ts   public entries (React component / IIFE auto-mount)
  mount.tsx               shadow host + adopted styles + React root inside shadow
  core/                   boot + runtime config + provider
  analytics/              DOM signal trackers (scroll, sections, idle, clicks)
  engagement/             pure score + trigger engine (when to ping)
  transport/              REST + fetch-based SSE client (injectable fetch)
  chat/                   bubble, panel, conversation, streaming hook
  intent/ funnel/         intent classification + funnel stage emitter
  iteration/              light-iteration capture, job polling, panel
  stubs/                  escalation / payment / setup (Phase 05–07)
  types/                  the shared records (Lead, Preview, Session, …)
```

---

## A note on naming

The original spec imports `@nutz/preview` and a `PreviewAgent` component; this
package ships as **`@nutz/phillip`** with `<Phillip>` as the primary export and
`PreviewAgent` kept as an alias, so the spec's snippet still works.

---

## License

MIT © nutz
