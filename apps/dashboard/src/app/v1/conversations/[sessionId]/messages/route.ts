import type { Intent, QuickReply, Sentiment } from "@nutz/phillip";
import { nanoid } from "nanoid";
import {
  CHAT_MODEL,
  anthropic,
  budgetCapUsd,
  recordModelUsage,
} from "../../../../../lib/anthropic";
import { corsJson, preflight } from "../../../../../lib/cors";
import { SSE_HEADERS, frame } from "../../../../../lib/sse";
import {
  DEFAULT_PERSONA,
  DEFAULT_PRICING,
  type PersonaSettings,
  type PricingSettings,
  appendMessages,
  countIterations,
  getConversationForLead,
  getConversationRow,
  getLeadRow,
  getSetting,
  getVisitorSession,
  setConversationQuickReplies,
  spendForLead,
} from "../../../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const OPTIONS = preflight;

interface SendMessageBody {
  message?: string;
  quickReplyId?: string;
  context?: Record<string, unknown>;
}

// The static quick replies the widget can send ids for without the model
// having proposed them (reaction chips + the mock's iterate options).
const STATIC_QUICK_REPLIES: Record<string, string> = {
  qr_love: "love it",
  qr_but: "looks good, but…",
  qr_no: "not feeling it",
  opt_colors: "the colors",
  opt_copy: "the words",
  opt_photos: "the photos",
};

const SIGNAL_TOOL = {
  name: "signal",
  description:
    "Report the lead's intent and pick at most one on-screen action for this turn. Call exactly once, after finishing your reply text.",
  input_schema: {
    type: "object" as const,
    properties: {
      intent: {
        type: "string",
        enum: ["positive", "iterate", "objection", "escalate", "unknown"],
        description: "What the lead's message expresses about the site.",
      },
      sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
      action: {
        type: "string",
        enum: ["none", "start_iteration", "escalate", "open_checkout"],
        description:
          "start_iteration when they want specific visual/copy changes; escalate for big builds (booking, ordering, e-commerce, login, CMS) or when they want a human; open_checkout on a clear buying signal.",
      },
      quick_replies: {
        type: "array",
        items: { type: "string" },
        maxItems: 3,
        description: "Optional short reply chips (2-4 words each), only when they genuinely help.",
      },
      change_request: {
        type: "string",
        description:
          "Required when action is start_iteration: the exact concrete change in the lead's words, one sentence, preserving quoted names/values verbatim (e.g. change the business name to 'Emir's Cafe'). Omit only if they have not yet said what to change.",
      },
    },
    required: ["intent", "sentiment", "action"],
  },
};

interface Signal {
  intent: Intent;
  sentiment: Sentiment;
  action: "none" | "start_iteration" | "escalate" | "open_checkout";
  quick_replies?: string[];
  change_request?: string;
}

function money(cents: number, currency: string): string {
  const symbol = currency === "eur" ? "€" : currency === "gbp" ? "£" : "$";
  const whole = Math.round(cents / 100);
  return `${symbol}${whole}`;
}

function systemPrompt(input: {
  persona: PersonaSettings;
  business: string;
  industry?: string;
  contact?: string;
  stage: string;
  pricing: { setup: string; monthly: string };
  roundsUsed: number;
  budgetExhausted: boolean;
  escalationEmail: string;
}): string {
  const who = input.contact ? `${input.contact}, who runs` : "the owner of";
  const lines = [
    `You are ${input.persona.name}, the person who built the website preview the visitor is looking at right now. You work at nutz, a small studio that designs and hosts websites for local businesses. You are chatting with ${who} ${input.business}${input.industry ? ` (a ${input.industry})` : ""}, inside a small chat bubble on their preview.`,
    "",
    "How you talk:",
    "- lowercase, relaxed, first person — like texting a client you respect",
    "- short: one to three sentences, never lists, headers, or emoji",
    "- plain words. no marketing speak, nothing that sounds automated or corporate",
    "- these are EU/US small-business owners: be warm, direct, and competent — a good tradesperson, not a salesman",
    "",
    "What you are doing: this preview is real and for sale. Get their honest reaction, make requested tweaks fast, and when they are happy, offer to make it live.",
    `- pricing, only when relevant or asked: ${input.pricing.setup} one-time for the site, then ${input.pricing.monthly}/mo which covers hosting, the domain wiring, and ongoing edits`,
    `- tweaks (colors, words, photos, names, layout, hours): confirm the specifics in one short line, then action start_iteration with change_request set to their exact ask — preserve quoted names and values verbatim. when the request is already concrete, never ask again what to change. inline rounds used so far: ${input.roundsUsed} of 3.`,
    "- big asks (booking systems, online ordering, e-commerce, member login, admin panels): say it is a bigger build your colleague handles, ask them to drop their email, action escalate.",
    `- if they explicitly want a human, same: action escalate. the team reads everything at ${input.escalationEmail}.`,
    "- clear buying signal (they love it, ask how to get it, say make it live): one short warm line, action open_checkout.",
    "- objections: take them seriously and offer one concrete fix. never argue, never grovel.",
  ];
  if (input.budgetExhausted) {
    lines.push(
      "- the inline tweak budget for this preview is used up: do not offer more instant edits. offer either the team follow-up (action escalate) or making it live as-is.",
    );
  }
  lines.push(
    "",
    `Funnel stage right now: ${input.stage}.`,
    "Always call the signal tool exactly once, after your reply text. If nothing on-screen should happen, use action none.",
  );
  return lines.join("\n");
}

export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  let body: SendMessageBody;
  try {
    body = (await req.json()) as SendMessageBody;
  } catch {
    return corsJson({ error: "invalid json" }, { status: 400 });
  }

  const session = await getVisitorSession(sessionId);
  if (!session) return corsJson({ error: "unknown session" }, { status: 404 });
  const lead = await getLeadRow(session.leadId);
  if (!lead) return corsJson({ error: "unknown lead" }, { status: 404 });

  // Resolve the user's text: free text, a static chip, or a model-proposed chip.
  let text = body.message?.trim();
  if (!text && body.quickReplyId) {
    const convRow = await getConversationRow(lead.id);
    const proposed = convRow?.lastQuickReplies?.find((q) => q.id === body.quickReplyId);
    text = proposed?.label ?? STATIC_QUICK_REPLIES[body.quickReplyId];
  }
  if (!text) return corsJson({ error: "message or quickReplyId required" }, { status: 400 });

  // Persist the lead's message first — even if the model call fails, the
  // dashboard transcript stays truthful.
  await appendMessages(sessionId, [
    { id: `msg_${nanoid(10)}`, role: "lead", text, ts: new Date().toISOString() },
  ]);

  const [persona, pricing, escalationEmail, spend, cap, roundsUsed, conversation] =
    await Promise.all([
      getSetting<PersonaSettings>("persona", DEFAULT_PERSONA),
      getSetting<PricingSettings>("pricing", DEFAULT_PRICING),
      getSetting<string>("escalationEmail", "team@nutz.inc"),
      spendForLead(lead.id),
      budgetCapUsd(lead.budgetCapUsd),
      countIterations(lead.id),
      getConversationForLead(lead.id),
    ]);

  const system = systemPrompt({
    persona,
    business: lead.business,
    industry: lead.industry ?? undefined,
    contact: lead.contact ?? undefined,
    stage: lead.stage,
    pricing: {
      setup: money(lead.setupAmountCents ?? pricing.setupAmountCents, pricing.currency),
      monthly: money(lead.monthlyAmountCents ?? pricing.monthlyAmountCents, pricing.currency),
    },
    roundsUsed,
    budgetExhausted: spend >= cap,
    escalationEmail,
  });

  // Map the stored thread to Anthropic turns: lead→user, phillip→assistant.
  // Merge consecutive same-role turns. Anthropic requires the first turn to be
  // `user`, and a thread seeded with the boot-time greeting starts with
  // phillip→assistant — so unshift a synthetic user turn when needed.
  const turns: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of (conversation?.messages ?? []).slice(-30)) {
    if (m.role === "system") continue;
    const role = m.role === "lead" ? "user" : "assistant";
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.content += `\n${m.text}`;
    else turns.push({ role, content: m.text });
  }
  if (turns.length === 0 || turns[0].role !== "user") {
    turns.unshift({ role: "user", content: "(i just opened the site preview)" });
  }

  const conversationId = (await getConversationRow(lead.id))?.id ?? `conv_${sessionId}`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(frame("meta", { conversationId }));
      let replyText = "";
      let signal: Signal | undefined;

      try {
        const runner = anthropic().messages.stream({
          model: CHAT_MODEL,
          max_tokens: 600,
          system,
          messages: turns,
          tools: [SIGNAL_TOOL],
        });
        runner.on("text", (t) => {
          replyText += t;
          controller.enqueue(frame("delta", { text: t }));
        });
        const final = await runner.finalMessage();

        for (const block of final.content) {
          if (block.type === "tool_use" && block.name === "signal") {
            signal = block.input as Signal;
          }
        }
        await recordModelUsage(lead.id, "chat", final.model, {
          input_tokens: final.usage.input_tokens,
          output_tokens: final.usage.output_tokens,
          cache_creation_input_tokens: final.usage.cache_creation_input_tokens,
          cache_read_input_tokens: final.usage.cache_read_input_tokens,
        });
      } catch (err) {
        console.error("chat stream failed", err);
        if (!replyText) {
          const fallback =
            "sorry — i dropped my connection for a second there. mind sending that again?";
          replyText = fallback;
          controller.enqueue(frame("delta", { text: fallback }));
        }
      }

      const intent: Intent = signal?.intent ?? "unknown";
      const sentiment: Sentiment = signal?.sentiment ?? "neutral";
      controller.enqueue(frame("intent", { intent }));
      controller.enqueue(frame("sentiment", { sentiment }));

      // No chips on an iteration turn — the takeover opens already building;
      // re-offering "what do you want to change" was the redundant-ask bug.
      if (signal?.quick_replies?.length && signal.action !== "start_iteration") {
        const chips: QuickReply[] = signal.quick_replies.slice(0, 3).map((label, i) => ({
          id: `qr_m_${nanoid(6)}_${i}`,
          label,
        }));
        controller.enqueue(frame("propose_quick_replies", { quickReplies: chips }));
        await setConversationQuickReplies(conversationId, chips).catch(() => {});
      }
      if (signal && signal.action !== "none") {
        const hint =
          signal.action === "start_iteration" ? signal.change_request?.trim() : undefined;
        controller.enqueue(frame(signal.action, hint ? { hint } : {}));
      }
      // Persist Phillip's reply BEFORE the response ends: Vercel reclaims the
      // serverless invocation at close(), so a post-close write was silently
      // dropped and resumed conversations lost Phillip's side entirely. The
      // catch keeps a failed write from blocking the clean close below.
      if (replyText) {
        await appendMessages(
          sessionId,
          [
            {
              id: `msg_${nanoid(10)}`,
              role: "phillip",
              text: replyText,
              ts: new Date().toISOString(),
              intent,
              sentiment,
            },
          ],
          { intent, sentiment },
        ).catch((err) => console.error("persist reply failed", err));
      }
      controller.enqueue(frame("done", {}));
      controller.close();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
