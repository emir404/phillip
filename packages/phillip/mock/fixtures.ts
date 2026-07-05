import { DEFAULT_ENGAGEMENT } from "../src/engagement/weights";
import type { Conversation } from "../src/intent/types";
import { prefixedId } from "../src/lib/id";
import type { BootConfig } from "../src/types/boot";

// Fake lead/business/persona/offer the mock backend serves on boot. The demo
// is "Marisol's", the example business from the spec.

export const DEMO_PREVIEW_ID = "prv_demo";

function phillipAvatar(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#ff8a5b"/><stop offset="1" stop-color="#ff4d8d"/>
</linearGradient></defs>
<rect width="96" height="96" rx="48" fill="url(#g)"/>
<text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" font-family="Inter,system-ui,sans-serif" font-size="44" font-weight="700" fill="#fff">P</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function resumedConversation(sessionId: string): Conversation {
  return {
    id: prefixedId("conv"),
    sessionId,
    channel: "web",
    messages: [
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
      avatarUrl: phillipAvatar(),
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
