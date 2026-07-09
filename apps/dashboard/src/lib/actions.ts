"use server";

import { revalidatePath } from "next/cache";
import { deleteBlockedReason, purgeLead } from "./leads";
import { createLeadWithPreview } from "./previews";
import {
  DEFAULT_PERSONA,
  DEFAULT_PRICING,
  type PersonaSettings,
  type PricingSettings,
  advanceLeadStage,
  getIteration,
  getLead,
  getLeadRow,
  getSetting,
  setSetting,
  updateEscalation,
  updateIteration,
  updateLeadFields,
  updatePreview,
} from "./store";

// Every action resolves to a plain result — never throws across the RPC
// boundary — so client callers can toast errors without try/catch gymnastics.
export type ActionResult<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

function fail(error: unknown, fallback: string): { ok: false; error: string } {
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

// --- leads -------------------------------------------------------------------

export interface CreateLeadInput {
  business: string;
  contact?: string;
  email?: string;
  industry?: string;
  source?: string;
  siteUrl?: string;
  /** Raw index.html source; enables automated iterations when present. */
  siteHtml?: string;
  /** GitHub repo holding the site source — iterations commit and push to it. */
  repoUrl?: string;
}

export async function createLeadAction(
  input: CreateLeadInput,
): Promise<ActionResult<{ leadId: string; previewId: string }>> {
  const business = input.business?.trim();
  if (!business) return { ok: false, error: "Business name is required." };
  try {
    const { leadId, previewId } = await createLeadWithPreview({
      business,
      contact: input.contact?.trim() || undefined,
      email: input.email?.trim() || undefined,
      industry: input.industry?.trim() || undefined,
      source: input.source?.trim() || "manual",
      siteUrl: input.siteUrl?.trim() || undefined,
      repoUrl: input.repoUrl?.trim() || undefined,
      files: input.siteHtml?.trim() ? [{ path: "index.html", content: input.siteHtml }] : undefined,
    });
    revalidatePath("/");
    return { ok: true, leadId, previewId };
  } catch (err) {
    return fail(err, "Could not create the lead.");
  }
}

// --- settings ----------------------------------------------------------------

export interface SaveSettingsInput {
  /** Major units, e.g. "299.00". */
  setupAmount: string;
  monthlyAmount: string;
  currency: string;
  budgetCapUsd: string;
  escalationEmail: string;
}

const toCents = (major: string): number | null => {
  const n = Number.parseFloat(major);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};

export async function saveSettingsAction(input: SaveSettingsInput): Promise<ActionResult> {
  const setupAmountCents = toCents(input.setupAmount);
  const monthlyAmountCents = toCents(input.monthlyAmount);
  if (setupAmountCents === null || monthlyAmountCents === null) {
    return { ok: false, error: "Amounts must be non-negative numbers." };
  }
  const cap = Number.parseFloat(input.budgetCapUsd);
  if (!Number.isFinite(cap) || cap < 0) {
    return { ok: false, error: "Budget cap must be a non-negative number." };
  }
  try {
    const pricing: PricingSettings = {
      setupAmountCents,
      monthlyAmountCents,
      currency: input.currency || DEFAULT_PRICING.currency,
    };
    await setSetting("pricing", pricing);
    await setSetting("budgetCapUsd", cap);
    await setSetting("escalationEmail", input.escalationEmail.trim());
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    return fail(err, "Could not save settings.");
  }
}

export async function savePersonaAction(input: {
  name: string;
  title: string;
}): Promise<ActionResult> {
  if (!input.name.trim()) return { ok: false, error: "Persona name is required." };
  try {
    const current = await getSetting<PersonaSettings>("persona", DEFAULT_PERSONA);
    await setSetting("persona", {
      ...current,
      name: input.name.trim(),
      title: input.title.trim(),
    });
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    return fail(err, "Could not save the persona.");
  }
}

export async function revealApiKeyAction(): Promise<ActionResult<{ key: string }>> {
  const key = process.env.PHILLIP_API_KEY;
  if (!key) return { ok: false, error: "PHILLIP_API_KEY is not configured." };
  return { ok: true, key };
}

// Deleting a lead erases everything about it — analytics, conversation,
// orders — and tears down the preview deployment. Real paying customers are
// protected; a paid TEST lead (rehearsals) can always go.
export async function deleteLeadAction(leadId: string): Promise<ActionResult> {
  try {
    const lead = await getLeadRow(leadId);
    if (!lead) return { ok: false, error: "Lead not found." };
    const blocked = deleteBlockedReason(lead);
    if (blocked) return { ok: false, error: blocked };

    await purgeLead(lead);
    revalidatePath("/");
    revalidatePath("/leads");
    return { ok: true };
  } catch (err) {
    return fail(err, "Could not delete the lead.");
  }
}

// Purchase rehearsals: a test-mode lead checks out against Stripe's test keys
// (4242… card, no real money) — same funnel, same webhook, same go-silent.
export async function setTestModeAction(leadId: string, on: boolean): Promise<ActionResult> {
  try {
    const lead = await getLeadRow(leadId);
    if (!lead) return { ok: false, error: "Lead not found." };
    await updateLeadFields(leadId, { testMode: on });
    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err, "Could not update test mode.");
  }
}

// --- go-live -------------------------------------------------------------------

export async function makeLiveAction(leadId: string): Promise<ActionResult> {
  try {
    const dl = await getLead(leadId);
    if (!dl) return { ok: false, error: "Lead not found." };
    if (dl.order?.status !== "paid") {
      return { ok: false, error: "The order has to be paid before the site goes live." };
    }
    await updatePreview(dl.preview.id, { status: "live" });
    await advanceLeadStage(leadId, "live");
    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err, "Could not flip the site live.");
  }
}

export interface DomainVerification {
  type: string;
  domain: string;
  value: string;
}

export async function connectDomainAction(
  leadId: string,
  domain: string,
): Promise<ActionResult<{ verification: DomainVerification[] }>> {
  const name = domain.trim().toLowerCase();
  if (!name) return { ok: false, error: "Enter a domain first." };
  // PHILLIP_-prefixed in production (Vercel reserves VERCEL_* names); plain
  // VERCEL_TOKEN still works locally.
  const token = process.env.PHILLIP_VERCEL_TOKEN ?? process.env.VERCEL_TOKEN;
  if (!token) return { ok: false, error: "PHILLIP_VERCEL_TOKEN is not configured on the server." };
  try {
    const lead = await getLeadRow(leadId);
    if (!lead) return { ok: false, error: "Lead not found." };
    if (!lead.vercelProjectId) {
      return { ok: false, error: "This lead has no Vercel project to attach the domain to." };
    }
    const teamId = process.env.PHILLIP_VERCEL_TEAM_ID ?? process.env.VERCEL_TEAM_ID;
    const url = new URL(`https://api.vercel.com/v10/projects/${lead.vercelProjectId}/domains`);
    if (teamId) url.searchParams.set("teamId", teamId);
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
      verification?: Array<{ type?: string; domain?: string; value?: string }>;
    };
    if (!res.ok) {
      return { ok: false, error: body.error?.message ?? `Vercel returned ${res.status}.` };
    }
    const verification = (body.verification ?? []).map((v) => ({
      type: v.type ?? "TXT",
      domain: v.domain ?? name,
      value: v.value ?? "",
    }));
    return { ok: true, verification };
  } catch (err) {
    return fail(err, "Could not reach the Vercel API.");
  }
}

// --- iterations & escalations ---------------------------------------------------

export async function markIterationDoneAction(id: string): Promise<ActionResult> {
  try {
    const row = await getIteration(id);
    if (!row) return { ok: false, error: "Iteration not found." };
    await updateIteration(id, { status: "done", statusReason: "handled_manually" });
    revalidatePath("/iterations");
    revalidatePath(`/leads/${row.leadId}`);
    return { ok: true };
  } catch (err) {
    return fail(err, "Could not mark the iteration done.");
  }
}

export async function markEscalationHandledAction(
  id: string,
  leadId: string,
): Promise<ActionResult> {
  try {
    await updateEscalation(id, { status: "handled" });
    revalidatePath(`/leads/${leadId}`);
    return { ok: true };
  } catch (err) {
    return fail(err, "Could not update the escalation.");
  }
}
