import { DEFAULT_ENGAGEMENT } from "../src/engagement/weights";
import { defaultGreeting } from "../src/intent/greeting";
import type { Conversation } from "../src/intent/types";
import { prefixedId } from "../src/lib/id";
import type { BootConfig } from "../src/types/boot";

// Fake lead/business/persona/offer the mock backend serves on boot. The demo
// is "Marisol's", the example business from the spec.

export const DEMO_PREVIEW_ID = "prv_demo";

// Temporary profile picture for the demo. In production the backend serves
// Phillip's real photo via `persona.avatarUrl`; here the playground serves this
// placeholder headshot from /public so the widget feels like a real person.
const PHILLIP_AVATAR = "/phillip.jpg";

// Mirrors a real persisted thread: the boot-seeded greeting (same copy as the
// server writes), the lead's reply from the first visit, then the re-visit line.
function resumedConversation(sessionId: string): Conversation {
  const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
  return {
    id: prefixedId("conv"),
    sessionId,
    channel: "web",
    messages: [
      {
        id: prefixedId("msg"),
        role: "phillip",
        text: defaultGreeting("Phillip", "Marisol's"),
        ts: ago(45),
      },
      {
        id: prefixedId("msg"),
        role: "lead",
        text: "looks great, but the photos feel a bit dark",
        ts: ago(44),
      },
      {
        id: prefixedId("msg"),
        role: "phillip",
        text: "hey, welcome back. still thinking it over?",
        ts: new Date().toISOString(),
      },
    ],
  };
}

export function makeBootConfig(previewId: string, opts?: { returning?: boolean }): BootConfig {
  const returning = opts?.returning ?? false;
  const sessionId = prefixedId("ses");
  return {
    previewId,
    apiBase: "",
    lead: { id: "lead_marisol", business: "Marisol's", industry: "restaurant", stage: "opened" },
    preview: {
      id: previewId,
      url: "https://nutz.site/marisol",
      version: 1,
      status: "draft",
    },
    persona: {
      name: "Phillip",
      title: "founder · nutz",
      avatarUrl: PHILLIP_AVATAR,
    },
    offer: {
      productId: "prod_site",
      priceId: "price_site_monthly",
      amount: 4900,
      currency: "usd",
      includes: ["your custom site", "your own domain", "hosting + ssl", "edits anytime"],
    },
    engagement: DEFAULT_ENGAGEMENT,
    features: { iteration: true, escalation: true, checkout: false, setup: false },
    session: { id: sessionId, returning, startedAt: new Date().toISOString() },
    conversation: returning ? resumedConversation(sessionId) : undefined,
  };
}
