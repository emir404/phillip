# Adding Phillip to a site

Phillip is the salesperson who lives on a website preview. He watches how the
visitor behaves, opens a chat wearing our face, takes their change requests and
ships them, then takes payment. One `<script>` tag turns a preview into that.

Every lead has a **preview id** (`prv_…`), minted when the lead is created. It is
the only credential the page carries: everything else — persona, pricing, the
conversation so far — comes from the backend at boot. Copy the snippet from the
dashboard (**New lead** dialog, or the **Install** card on any lead) so the id is
already filled in.

## Any site

Paste into `<head>`:

```html
<script src="https://phillip-dashboard-eight.vercel.app/phillip.js"
        data-preview-id="prv_YOUR_ID"
        defer></script>
```

| Attribute | Required | Meaning |
| --- | --- | --- |
| `data-preview-id` | yes | Which lead this page belongs to. |
| `data-api-base` | no | Backend origin. Defaults to wherever `phillip.js` came from, so you rarely need it. |
| `data-debug` | no | Verbose logging. `?phillip_debug` in the URL does the same. |

## Next.js (App Router)

```tsx
// app/layout.tsx
import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="https://phillip-dashboard-eight.vercel.app/phillip.js"
          data-preview-id="prv_YOUR_ID"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
```

Use `afterInteractive` (the default). The widget is an overlay — it must not
block hydration, and `beforeInteractive` would.

## React, via npm

```bash
npm i @nutz/phillip
```

```tsx
"use client";
import { Phillip } from "@nutz/phillip";

export function SiteAgent() {
  return <Phillip previewId="prv_YOUR_ID" />;
}
```

It renders `null` and mounts into a shadow root from an effect, so it is inert
during SSR — but it is a client component. For non-React frameworks there's an
imperative `mount({ previewId })` that returns a disposer.

## What the tag does to the page

Nothing it can help. The widget renders inside a **shadow root**, so the site's
CSS can't leak in and Phillip's can't leak out. It never blocks paint. Two
attributes on the site are load-bearing for analytics and iteration, so keep them
if you have them: `data-section="hero"` (dwell heatmap, and how the editor finds
the right JSX) and `data-cta` / `data-gallery` / `data-contact`.

## Two kinds of lead

- **Repo-backed** — the lead carries a GitHub repo (a Next or Vite app). A
  change request edits the source, commits, and pushes; the repo's own Vercel
  project builds it, and the visitor watches their site update in place.
- **File-backed** — the lead carries generated HTML. Phillip edits the files and
  deploys them straight to a preview project.

A lead with neither still chats; iteration requests queue for a human instead of
running automatically.

## Once they pay

The widget disappears on its own. The boot response goes silent for a paid lead,
and a visitor returning from Stripe (`?phillip=paid`) is never shown the chat
again. There is nothing to uninstall — though you should keep the tag, because
it's how the dashboard keeps seeing the site.

**Test mode.** Flip *Test mode* on a lead and its checkout runs against Stripe's
test keys, so the whole purchase can be rehearsed with the `4242…` card and no
real money. Test leads can be deleted afterwards; paying ones can't.
