import { nanoid } from "nanoid";
import { db } from "../db/client";
import { leads, previews } from "../db/schema";
import { putSiteFiles } from "./store";

// The one place a lead + preview pair is minted — used by the auto-mode
// preview API (build agents) and the dashboard's "New lead" action, so both
// modes produce identical records.

export interface CreatePreviewInput {
  business: string;
  contact?: string;
  email?: string;
  industry?: string;
  source?: string;
  /** Where the preview site lives (if already deployed). */
  siteUrl?: string;
  /** Vercel project the site deploys to (iteration executor target). */
  vercelProjectId?: string;
  /** Site source files — required for automated iterations. */
  files?: { path: string; content: string }[];
}

export async function createLeadWithPreview(input: CreatePreviewInput) {
  const now = new Date().toISOString();
  const leadId = `lead_${nanoid(10)}`;
  // The preview id is the public capability a site carries — long + unguessable.
  const previewId = `prv_${nanoid(21)}`;

  await db.insert(leads).values({
    id: leadId,
    business: input.business,
    contact: input.contact ?? null,
    industry: input.industry ?? null,
    email: input.email ?? null,
    source: input.source ?? "manual",
    stage: "delivered",
    engagementScore: 5,
    vercelProjectId: input.vercelProjectId ?? null,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(previews).values({
    id: previewId,
    leadId,
    url: input.siteUrl ?? "",
    version: 1,
    status: "draft",
  });
  if (input.files?.length) {
    await putSiteFiles(leadId, input.files);
  }

  return { leadId, previewId };
}

export function embedSnippet(host: string, previewId: string): string {
  return `<script src="${host}/phillip.js" data-preview-id="${previewId}" defer></script>`;
}

export function previewResponse(host: string, leadId: string, previewId: string) {
  return {
    leadId,
    previewId,
    embedScriptUrl: `${host}/phillip.js`,
    snippet: embedSnippet(host, previewId),
  };
}
