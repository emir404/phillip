import { corsJson, preflight } from "../../../../lib/cors";
import { getIteration } from "../../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

// The widget's poll target while a build runs.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const iteration = await getIteration(id);
  if (!iteration) return corsJson({ error: "not found" }, { status: 404 });
  return corsJson({
    id: iteration.id,
    status: iteration.status,
    resultUrl: iteration.resultUrl ?? undefined,
    version: iteration.version ?? undefined,
  });
}
