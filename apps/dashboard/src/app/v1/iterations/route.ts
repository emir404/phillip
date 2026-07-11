import type { ChangeSet } from "@nutz/phillip";
import { after } from "next/server";
import { budgetCapUsd } from "../../../lib/anthropic";
import { storeAsset } from "../../../lib/assets";
import { corsJson, preflight } from "../../../lib/cors";
import { runIteration } from "../../../lib/executor";
import { githubToken, parseRepo } from "../../../lib/github";
import {
  advanceLeadStage,
  createIteration,
  getLeadByPreviewId,
  getLeadRow,
  getSiteFiles,
  spendForLead,
} from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The executor (Claude edit + Vercel deploy) runs via after() inside this
// function's lifetime — give it room.
export const maxDuration = 300;

export const OPTIONS = preflight;

interface CreateIterationBody {
  previewId: string;
  changeSet: ChangeSet;
  round: number;
  sessionId?: string;
}

// Mirrors the widget's client-side cap (Takeover) — enforced here too so a
// hand-rolled request can't ship an unbounded pile of files to the executor.
const MAX_ATTACHMENTS = 5;

// The embed's iteration request: create the job, kick the executor after the
// response flushes, let the widget poll /v1/iterations/:id. A repo-backed lead
// always runs — pushing the commit is the deploy. Only a genuinely blocked job
// (no source at all, no key, budget spent) lands in the dashboard queue as
// queued_manual, and even then the lead is never promised an email.
export async function POST(req: Request) {
  let body: CreateIterationBody;
  try {
    body = (await req.json()) as CreateIterationBody;
  } catch {
    return corsJson({ error: "invalid json" }, { status: 400 });
  }
  if (!body?.previewId || !body?.changeSet) {
    return corsJson({ error: "previewId and changeSet required" }, { status: 400 });
  }
  if ((body.changeSet.attachments?.length ?? 0) > MAX_ATTACHMENTS) {
    return corsJson(
      { error: `at most ${MAX_ATTACHMENTS} attachments per change request` },
      { status: 400 },
    );
  }

  const found = await getLeadByPreviewId(body.previewId);
  if (!found) return corsJson({ error: "unknown preview" }, { status: 404 });
  const { lead } = found;

  const [spend, cap, sources, leadRow] = await Promise.all([
    spendForLead(lead.id),
    budgetCapUsd(lead.budgetCapUsd),
    getSiteFiles(lead.id),
    getLeadRow(lead.id),
  ]);
  // A repo IS the site source — such leads carry no site_files rows.
  const repoUrl = leadRow?.repoUrl ?? null;
  // Tokens are per owner, so "we have a token" is only ever a question about
  // THIS repo's owner — a token for another org would fail at commit time.
  const repoRef = repoUrl ? parseRepo(repoUrl) : null;

  let status: "queued" | "queued_manual" = "queued";
  let statusReason: string | undefined;
  if (spend >= cap) {
    status = "queued_manual";
    statusReason = "budget";
  } else if (sources.length === 0 && !repoUrl) {
    status = "queued_manual";
    statusReason = "no_source";
  } else if (repoUrl && !(repoRef && githubToken(repoRef.owner))) {
    status = "queued_manual";
    statusReason = "no_github_token";
  } else if (!process.env.ANTHROPIC_API_KEY) {
    status = "queued_manual";
    statusReason = "no_api_key";
  }

  // Attachments arrive as `data:` URLs (read client-side, never touching
  // disk) — persist them once here and swap in a real hosted URL, so neither
  // the DB row nor the executor's prompt ever carries the base64 payload
  // around.
  let changeSet = body.changeSet;
  if (changeSet.attachments?.length) {
    const origin = new URL(req.url).origin;
    const hosted = await Promise.all(
      changeSet.attachments.map(async (a) => ({
        ...a,
        url: `${origin}/v1/assets/${await storeAsset(a.url)}`,
      })),
    );
    changeSet = { ...changeSet, attachments: hosted };
  }

  const iteration = await createIteration({
    leadId: lead.id,
    previewId: body.previewId,
    sessionId: body.sessionId,
    round: body.round ?? 1,
    changeSet,
    status,
    statusReason,
  });
  await advanceLeadStage(lead.id, "iterating");

  if (status === "queued") {
    after(() => runIteration(iteration.id));
  }

  return corsJson({ id: iteration.id, status: iteration.status }, { status: 201 });
}
