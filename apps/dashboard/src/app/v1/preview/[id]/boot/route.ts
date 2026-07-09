import type { BootConfig } from "@nutz/phillip";
import { defaultGreeting } from "@nutz/phillip/greeting";
import { DEFAULT_ENGAGEMENT } from "@nutz/phillip/weights";
import { corsJson, preflight } from "../../../../../lib/cors";
import {
  DEFAULT_PERSONA,
  DEFAULT_PRICING,
  type PersonaSettings,
  type PricingSettings,
  createVisitorSession,
  getConversationForLead,
  getLeadByPreviewId,
  getSetting,
  seedConversation,
} from "../../../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

const DEFAULT_INCLUDES = [
  "custom design, built for you",
  "hosting, domain wiring + ssl",
  "edits within 24h",
  "cancel hosting anytime",
];

// The embed's single mount fetch: resolve a preview id to everything the
// widget needs (lead, persona, offer, engagement tuning, a fresh session, and
// the resumed conversation for returning visitors).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getLeadByPreviewId(id);
  if (!found) return corsJson({ error: "unknown preview" }, { status: 404 });
  const { lead, preview } = found;

  const origin = new URL(req.url).origin;
  const [persona, pricing, includes] = await Promise.all([
    getSetting<PersonaSettings>("persona", DEFAULT_PERSONA),
    getSetting<PricingSettings>("pricing", DEFAULT_PRICING),
    getSetting<string[]>("offerIncludes", DEFAULT_INCLUDES),
  ]);

  const session = await createVisitorSession({
    previewId: preview.id,
    leadId: lead.id,
    referrer: req.headers.get("referer") ?? undefined,
  });
  // First boot for this lead: persist the greeting so every thread starts with
  // the agent — it used to live only client-side, so resumed history began
  // with the lead's reply to a line the DB never saw.
  let conversation = await getConversationForLead(lead.id);
  if (!conversation?.messages.length) {
    await seedConversation(lead.id, session.id, defaultGreeting(persona.name, lead.business));
    conversation = await getConversationForLead(lead.id);
  }

  const boot: BootConfig = {
    previewId: preview.id,
    apiBase: origin,
    lead: {
      id: lead.id,
      business: lead.business,
      industry: lead.industry ?? undefined,
      stage: lead.stage,
    },
    preview: { id: preview.id, url: preview.url, version: preview.version, status: preview.status },
    persona: {
      ...persona,
      // Must be absolute — a relative path would resolve against the lead
      // site's origin, not ours.
      avatarUrl: new URL(persona.avatarUrl, origin).toString(),
    },
    offer: {
      productId: "site_standard",
      priceId: "inline",
      amount: lead.setupAmountCents ?? pricing.setupAmountCents,
      currency: pricing.currency,
      monthlyAmount: lead.monthlyAmountCents ?? pricing.monthlyAmountCents,
      includes,
    },
    engagement: DEFAULT_ENGAGEMENT,
    features: { iteration: true, escalation: true, checkout: true, setup: false },
    session: { id: session.id, returning: session.returning, startedAt: session.startedAt },
    conversation: conversation?.messages.length ? conversation : undefined,
  };

  return corsJson(boot);
}
