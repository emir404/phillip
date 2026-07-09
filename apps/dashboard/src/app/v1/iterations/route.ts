import type { ChangeSet } from "@nutz/phillip";
import { after } from "next/server";
import { budgetCapUsd } from "../../../lib/anthropic";
import { corsJson, preflight } from "../../../lib/cors";
import { runIteration } from "../../../lib/executor";
import {
  advanceLeadStage,
  createIteration,
  getLeadByPreviewId,
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

// The embed's iteration request: create the job, kick the executor after the
// response flushes, let the widget poll /v1/iterations/:id. Jobs that can't
// run automatically land in the dashboard queue as queued_manual — the lead
// hears "the team is picking this up" instead of a fake success.
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

  const found = await getLeadByPreviewId(body.previewId);
  if (!found) return corsJson({ error: "unknown preview" }, { status: 404 });
  const { lead } = found;

  const [spend, cap, sources] = await Promise.all([
    spendForLead(lead.id),
    budgetCapUsd(lead.budgetCapUsd),
    getSiteFiles(lead.id),
  ]);

  let status: "queued" | "queued_manual" = "queued";
  let statusReason: string | undefined;
  if (spend >= cap) {
    status = "queued_manual";
    statusReason = "budget";
  } else if (sources.length === 0) {
    status = "queued_manual";
    statusReason = "no_source";
  } else if (!process.env.ANTHROPIC_API_KEY) {
    status = "queued_manual";
    statusReason = "no_api_key";
  }

  const iteration = await createIteration({
    leadId: lead.id,
    previewId: body.previewId,
    sessionId: body.sessionId,
    round: body.round ?? 1,
    changeSet: body.changeSet,
    status,
    statusReason,
  });
  await advanceLeadStage(lead.id, "iterating");

  if (status === "queued") {
    after(() => runIteration(iteration.id));
  }

  return corsJson({ id: iteration.id, status: iteration.status }, { status: 201 });
}
