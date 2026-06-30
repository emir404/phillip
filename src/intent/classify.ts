import type { Intent, QuickReply, Sentiment } from "./types";

// Client-side fallback classification. The backend is the source of truth (it
// streams an `intent` event), but this lets the widget route immediately and
// degrade gracefully if the stream omits one.

export function classifyQuickReply(qr: QuickReply): Intent {
  return qr.intent ?? "unknown";
}

const ESCALATE_RE =
  /\b(talk|call|phone|human|someone|colleague|book|booking|reserv|menu|ecommerce|shop|integrat|custom)\b/;
const POSITIVE_RE =
  /\b(love|great|perfect|amazing|looks good|nice|yes|ship it|make it live|go live|let's go)\b/;
const NEGATIVE_RE = /\b(hate|ugly|bad|wrong|not feeling|don'?t like|awful|nope|meh)\b/;
const ITERATE_RE =
  /\b(change|color|colour|photo|image|copy|text|headline|font|logo|hours|contact|swap|darker|lighter|warmer|bolder|but)\b/;

export function classifyText(text: string): { intent: Intent; sentiment: Sentiment } {
  const t = text.toLowerCase();
  if (ESCALATE_RE.test(t)) return { intent: "escalate", sentiment: "neutral" };
  if (NEGATIVE_RE.test(t)) return { intent: "objection", sentiment: "negative" };
  if (POSITIVE_RE.test(t)) return { intent: "positive", sentiment: "positive" };
  if (ITERATE_RE.test(t)) return { intent: "iterate", sentiment: "neutral" };
  return { intent: "unknown", sentiment: "neutral" };
}
