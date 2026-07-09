import { nanoid } from "nanoid";
import { db } from "../db/client";
import { leads, previews } from "../db/schema";
import { findVercelProjectByRepo } from "./executor";
import { getRepoInfo, parseRepo, repoUrl as toRepoUrl } from "./github";
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
  /** GitHub repo holding the site source: `owner/repo`, a URL, or a bare name. */
  repoUrl?: string;
}

export class InvalidRepoError extends Error {
  constructor(input: string) {
    super(`"${input}" is not a GitHub repo — use owner/repo or a github.com URL`);
    this.name = "InvalidRepoError";
  }
}

/**
 * Resolve what we can about a repo without blocking lead creation on it: the
 * branch and the linked Vercel project are nice to have, and both are
 * back-filled at iteration time if they aren't reachable now.
 */
async function resolveRepo(input: string) {
  const ref = parseRepo(input);
  if (!ref) throw new InvalidRepoError(input);

  let branch: string | null = null;
  try {
    branch = (await getRepoInfo(ref)).defaultBranch;
  } catch {
    branch = null;
  }
  const project = await findVercelProjectByRepo(toRepoUrl(ref));
  return { url: toRepoUrl(ref), branch, project };
}

export async function createLeadWithPreview(input: CreatePreviewInput) {
  const now = new Date().toISOString();
  const leadId = `lead_${nanoid(10)}`;
  // The preview id is the public capability a site carries — long + unguessable.
  const previewId = `prv_${nanoid(21)}`;

  const repo = input.repoUrl?.trim() ? await resolveRepo(input.repoUrl.trim()) : null;

  await db.insert(leads).values({
    id: leadId,
    business: input.business,
    contact: input.contact ?? null,
    industry: input.industry ?? null,
    email: input.email ?? null,
    source: input.source ?? "manual",
    stage: "delivered",
    engagementScore: 5,
    vercelProjectId: repo?.project?.projectId ?? input.vercelProjectId ?? null,
    repoUrl: repo?.url ?? null,
    repoBranch: repo?.branch ?? null,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(previews).values({
    id: previewId,
    leadId,
    url: input.siteUrl ?? repo?.project?.productionUrl ?? "",
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

/**
 * The same tag for a Next.js App Router site. `afterInteractive` is right:
 * the widget is an overlay, so it must not block hydration, and next/script
 * passes the data-* attributes through untouched.
 */
export function nextSnippet(host: string, previewId: string): string {
  return [
    'import Script from "next/script";',
    "",
    "// app/layout.tsx — inside <body>, after {children}",
    "<Script",
    `  src="${host}/phillip.js"`,
    `  data-preview-id="${previewId}"`,
    '  strategy="afterInteractive"',
    "/>",
  ].join("\n");
}

export function previewResponse(host: string, leadId: string, previewId: string) {
  return {
    leadId,
    previewId,
    embedScriptUrl: `${host}/phillip.js`,
    snippet: embedSnippet(host, previewId),
  };
}
