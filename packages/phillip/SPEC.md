# Phillip

**The autonomous preview-to-paid agent**

*nutz.inc · product spec · v0.1 · June 2026*

---

*How a cold, auto-generated website preview becomes a paying customer, with no human in the loop.*

### Contents

1. The idea
2. One install, backend-driven
3. Meet Phillip
4. The flow, phase by phase
5. What gets tracked
6. Agents and handoffs
7. Light vs heavy
8. The records
9. Open questions

---

## The idea

Phillip is the layer that turns a cold, auto-generated website preview into a paying customer. nutz scouts a business, builds them a site, and sends a link. Phillip lives on that link: he watches how the lead behaves, opens a conversation in the bottom-right corner wearing the face of our sales guy, handles their feedback, takes payment, and walks them through setup.

It ships as a small npm module the Build agent drops into every preview. One install, and any generated site gets the full preview-to-paid experience.

> **The loop:** Land → Engage → React → Iterate or escalate → Pay → Set up

**Where it sits in the pipeline:** Scout → Build → Outreach → **Phillip** → Live customer. Everything before Phillip produces a link. Phillip is what happens after the link is opened.

**How to read this doc:** every phase below is split into **on screen** (what the lead sees and does) and **off screen** (what the system does in the background). That split is the whole point: it keeps the customer-facing story and the machinery clearly separated.

---

## One install, backend-driven

The embed is deliberately dumb. It boots with a single `previewId` and pulls everything else (persona, the offer, current state, Stripe keys) from the backend. That keeps secrets off the page, and lets us change the offer, the script, or Phillip himself without redeploying a single site.

### React component

```jsx
import { PreviewAgent } from "@nutz/preview";

export default function Page() {
  return (
    <>
      <GeneratedSite />
      <PreviewAgent previewId="prv_8f2a" />
    </>
  );
}
```

Everything tied to `prv_8f2a` (the business, Phillip's avatar, the offer, the live conversation state) is fetched on mount.

### Drop-in script

For previews that are not React, the same thing as one tag:

```html
<script
  src="https://cdn.nutz.inc/preview.js"
  data-preview-id="prv_8f2a"
  defer
></script>
```

### What it bundles

- **The Phillip chat UI**: the bottom-right bubble, the conversation, quick replies, and avatar.
- **Silent analytics**: behavior tracking and the engagement score that decides when to ping.
- **Agent transport**: a streaming connection to the backend agent so replies feel real-time.
- **Stripe checkout**, opened inline when it is time to close.
- **The setup flow** that runs after payment.

---

## Meet Phillip

The agent uses the real face and name of Phillip, the salesperson on our team, so leads meet a familiar person instead of a faceless widget. It is an AI stand-in for him: it lets one sales guy greet every lead on every preview at once, in his voice. Phillip is warm, direct, and low-pressure. He gives an honest read and never hard-sells.

### Avatar, in stages

- **Now:** a still photo of Phillip plus his name and title. Enough to feel human.
- **Next:** a short looping video so the bubble feels alive.
- **Later:** real-time AI video or voice for true back-and-forth.

### Voice

- Lowercase, casual, fast. Short messages, not paragraphs.
- Specific to their business by name. Generic lines kill trust.
- Opinionated but never pushy. "here's what i'd change" beats "would you like to make changes?"
- No corporate filler. He talks like a person, not a support macro.

### Disclosure & likeness

Because this is a real teammate's face and name, two calls to make. First, how clearly to signal that the agent is an AI stand-in rather than Phillip typing live; the recommendation is a light, honest touch. Second, a quick sign-off from Phillip on using his likeness and voice, including what happens to it if he ever leaves the team.

---

## The flow, phase by phase

Eight phases, from build to live. Each one is split into what the lead sees and what runs underneath.

### Phase 00 · Build & inject

*Before the lead sees anything. The Build agent finishes the site and wires in the agent.*

**On screen**
- Nothing yet. The site exists but has not been sent.

**Off screen**
- Build agent finishes the site and creates a Preview record with a unique `previewId`.
- The embed is injected into the page carrying only that `previewId`. No secrets touch the markup.
- Backend is seeded with the lead and business context, the offer, Phillip's persona, and an empty session slot.
- A signed, expiring preview URL is generated for Outreach to send (e.g. `nutz.site/marisol?p=prv_8f2a`).

### Phase 01 · Landing

*The lead clicks the link. First impression is the site itself. Phillip stays quiet.*

**On screen**
- The generated site loads in full: their name, copy, photos, the real thing.
- A small Phillip bubble rests in the bottom right, closed and calm, with a soft pulse after a few seconds.
- No interruption. They get to look first.

**Off screen**
- `previewId` is resolved to the lead, persona, offer, and any earlier session if they are returning.
- A session starts: timestamp, device, browser, coarse location, referrer, returning-visitor check.
- Tracking begins: pageviews, scroll depth, section visibility, time, and clicks.
- The engagement score starts accumulating in the background.

### Phase 02 · The ping

*Phillip waits for a signal of interest, not just a timer. When it crosses a threshold, he opens.*

**On screen**
- The bubble expands with Phillip's face and a short, specific greeting.
- Example: "hey, i'm phillip. i built this one for marisol's. honest take, what do you think?"
- Three quick replies: love it / looks good, but... / not feeling it. Typing is always open too.

**Off screen**
- The trigger engine decides the moment: engagement threshold, dwell, exit intent, or a hard fallback timer so nobody is missed.
- The ping event and the reason it fired are logged for tuning.
- The agent is pre-warmed with full context so the first real reply is instant.

### Phase 03 · The reaction

*The branch point. Three doors, and free text routes into the right one.*

**On screen**
- "love it" moves toward the close (Phase 06).
- "looks good, but..." opens the iteration flow (Phase 04).
- "not feeling it" gets a gentle probe: "fair. what's off, the look, the words, or the photos?" then routes to 04 or 05.

**Off screen**
- The response is classified into intent (positive, iterate, objection) plus a sentiment read.
- The lead is routed to the matching sub-flow.
- The lead record and funnel stage update.

### Phase 04 · Light iteration

*Small, well-scoped changes Phillip turns around with no human: copy, colors, a photo swap, section toggles, headline, hours, contact details.*

**On screen**
- Phillip asks for specifics with guided options (colors, copy, images, sections) or free text.
- He plays it back in plain words: "got it, warmer palette, swap the hero photo, punchier headline. give me a sec."
- A working state shows, then he pings when it's ready: "done, refresh to see it."

**Off screen**
- The request is captured and structured into a change-set.
- It goes to the Build agent, which regenerates against the same `previewId`.
- Job status is tracked; on success the live preview is swapped (or an updated URL is minted).
- The iteration and its round count are logged. Rounds feed the escalation rule.

### Phase 05 · Escalation

*When the ask is bigger than a tweak (new pages, custom features, integrations, real back-and-forth), Phillip stops solving on the page and brings in the email agent.*

**On screen**
- Phillip: "that's a bigger change and worth doing right. drop your email and my colleague will pick it up, usually within the hour."
- Email is captured and validated, then confirmed: "sent. look out for a note from phillip@nutz.inc."

**Off screen**
- An email thread is created and the Email agent spins up with everything Phillip already knows.
- The Email agent owns the thread autonomously from here. Phillip steps back but stays available on the page.
- CRM stage flips to escalated. An optional human-in-the-loop flag covers edge cases.

### Phase 06 · Close & payment

*When they're happy, Phillip makes the offer concrete and gets out of the way.*

**On screen**
- Phillip lays out what's included, the price, and a single "make it live" button.
- Stripe checkout opens as an embedded sheet or hosted page.
- On success: a clean in-chat confirmation. On failure: a graceful retry or another method.

**Off screen**
- A Stripe Checkout session is created for the right product and price.
- The payment webhook is verified before anything else happens.
- On paid: the order is recorded, the lead becomes a customer, and setup is triggered.
- On abandon: it's logged so Phillip can follow up gently later.

### Phase 07 · Setup & onboarding

*Payment is not the finish line. Phillip becomes a setup guide so the customer ends up with a live site, not just a receipt.*

**On screen**
- Phillip switches to setup mode with a short, one-at-a-time checklist.
- Steps: connect a domain (or buy one through us), confirm logo, photos, hours, and contact info, then final approval.
- Plain language throughout, with a small celebration at go-live.

**Off screen**
- The real site is provisioned (preview is promoted to production) and the account is created.
- Domain is handled: DNS instructions or automated connection, SSL issued, deploy run.
- Any missing assets are collected; confirmation and login are sent.
- Hand off to a success or support agent, or a self-serve dashboard, for the long tail.

---

## What gets tracked

Phillip is always watching, quietly. Two reasons: to know the right moment to speak, and to give the team a real picture of every lead.

### Signals on the page

- **Reach:** pageviews, sections viewed, max scroll depth, time on page, active versus idle time.
- **Attention:** which sections held them (hero, pricing, gallery, contact) and for how long.
- **Intent:** clicks and taps, CTA hovers, gallery opens, video plays, contact interactions.
- **Context:** device, OS, browser, viewport, coarse location, referrer and source.
- **Return:** repeat visits and how recent.
- **Conversation:** opened, replied, intent, sentiment, iteration rounds, and where they dropped.

### The engagement score

A weighted score (dwell, scroll, time on pricing, return visits) decides when Phillip pings, with a fallback timer so no lead is ever ignored. The weights are exposed to the team for tuning.

### The funnel

Every lead moves through a clear set of stages, and each transition is an event:

> delivered → opened → engaged → reacted → iterating / escalated → checkout → paid → live

---

## Agents and handoffs

Four agents, one shared record. The trick is that none of them rely on memory. They read and write the same lead and session state, so context never resets when a lead passes between them.

| Agent | Owns |
|---|---|
| **Build agent** | Makes the site and regenerates it on every iteration. Owns the artifact. |
| **Phillip** | The visible layer: engages, classifies, handles light iteration, closes, and guides setup. Owns the live conversation while the tab is open. |
| **Email agent** | Takes over for heavy or complex asks. Owns the async email thread. |
| **Setup agent** | Provisioning, domain, deploy, and account. Owns go-live. |

The shared spine is one lead record (lead, session, events, conversation, order, account). **State carries the customer, not any single agent's memory.**

---

## Light vs heavy

The line between what Phillip fixes on the page and what goes to the email agent. When in doubt, escalate: a bad inline attempt costs more than a clean handoff.

**Phillip handles inline**
- Copy and headline edits.
- Palette, theme, fonts.
- Swap or remove photos.
- Toggle and reorder sections.
- Hours, contact info, small layout fixes.

**Goes to the email agent**
- New pages or sections from scratch.
- Custom features (booking, menus with logic, e-commerce).
- Third-party integrations.
- Multi-round creative direction.
- Scope, pricing, or legal questions.
- Anything beyond "just a website."

The trigger is a mix: a classifier on the request, a round cap (after a few inline loops without converging, escalate), and any explicit "can i talk to someone."

---

## The records

The shared state every agent reads and writes.

- **Lead:** `id, business, contact, industry, email?, source, stage`
- **Preview:** `id, leadId, url, version, status (draft / live / superseded)`
- **Session:** `id, previewId, device, geo, referrer, startedAt, lastSeen, returning`
- **Event:** `id, sessionId, type, payload, ts`
- **Conversation:** `id, sessionId, channel (web / email), messages, intent, sentiment`
- **IterationRequest:** `id, previewId, changeSet, round, status`
- **Order:** `id, leadId, stripeId, amount, status`
- **Account:** `id, customer, domain, siteId, login`

---

## Open questions

Ship with the obvious default, decide these as we go. None of them should block v0.

- **Iteration ceiling:** how many inline rounds before auto-escalation, and what counts as truly light.
- **Domains:** do we register and sell domains, or only connect existing ones?
- **Hosting:** where live sites run after promotion (our infra, Vercel, and so on).
- **Language:** match the agent to the lead's site language (tr / en / others).
- **Consent and compliance:** analytics and email-capture rules by region (GDPR, CCPA).
- **Anti-abuse:** signed, expiring preview URLs, scrape protection, and iteration rate limits.
