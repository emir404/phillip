import { corsJson, preflight } from "../../../../lib/cors";
import { getIteration, updateIteration } from "../../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

// The executor shares one serverless invocation with the build it waits on. If
// that invocation is reclaimed, nothing is left to write the failure — the row
// would sit in `processing` forever and the widget would spin. The poll itself
// is the natural place to notice.
const STALE_PROCESSING_MS = 6 * 60_000;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const iteration = await getIteration(id);
  if (!iteration) return corsJson({ error: "not found" }, { status: 404 });

  let status = iteration.status;
  if (
    status === "processing" &&
    Date.parse(iteration.updatedAt) < Date.now() - STALE_PROCESSING_MS
  ) {
    status = "failed";
    await updateIteration(id, { status, statusReason: "error:executor_lost" });
  }

  return corsJson({
    id: iteration.id,
    status,
    resultUrl: iteration.resultUrl ?? undefined,
    version: iteration.version ?? undefined,
  });
}
