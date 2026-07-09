import Anthropic from "@anthropic-ai/sdk";
import { getSetting, recordUsage } from "./store";

// One Anthropic client per process + the pricing table that turns token usage
// into the per-lead spend the budget cap is enforced against.

const GLOBAL_KEY = "__phillip_anthropic__";

export function anthropic(): Anthropic {
  const g = globalThis as unknown as Record<string, Anthropic | undefined>;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = new Anthropic();
  return g[GLOBAL_KEY] as Anthropic;
}

export const CHAT_MODEL = process.env.PHILLIP_CHAT_MODEL ?? "claude-haiku-4-5";
export const EXECUTOR_MODEL = process.env.PHILLIP_EXECUTOR_MODEL ?? "claude-opus-4-8";

// USD per million tokens (input, output). Unknown models fall back to the most
// expensive row so the cap errs on the safe side.
const MODEL_RATES: Record<string, { inPerM: number; outPerM: number }> = {
  "claude-haiku-4-5": { inPerM: 1, outPerM: 5 },
  "claude-sonnet-5": { inPerM: 3, outPerM: 15 },
  "claude-opus-4-8": { inPerM: 5, outPerM: 25 },
};
const FALLBACK_RATE = { inPerM: 5, outPerM: 25 };

export function costUsd(
  model: string,
  usage: { input_tokens: number; output_tokens: number },
): number {
  const rate = MODEL_RATES[model] ?? FALLBACK_RATE;
  return (usage.input_tokens * rate.inPerM + usage.output_tokens * rate.outPerM) / 1_000_000;
}

export async function recordModelUsage(
  leadId: string,
  kind: "chat" | "iteration",
  model: string,
  usage: { input_tokens: number; output_tokens: number },
): Promise<void> {
  await recordUsage({
    leadId,
    kind,
    model,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    costUsd: costUsd(model, usage),
  });
}

export async function budgetCapUsd(leadCap: number | null): Promise<number> {
  if (typeof leadCap === "number") return leadCap;
  // Per-lead override → settings (editable in /settings) → env default.
  return getSetting("budgetCapUsd", Number(process.env.PHILLIP_BUDGET_CAP_USD ?? 5));
}
