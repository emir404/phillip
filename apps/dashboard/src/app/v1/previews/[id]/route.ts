import { NextResponse } from "next/server";
import { previewResponse } from "../../../../lib/previews";
import { getLeadByPreviewId } from "../../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Auto mode: fetch a preview registration (key-gated).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (
    !process.env.PHILLIP_API_KEY ||
    req.headers.get("x-api-key") !== process.env.PHILLIP_API_KEY
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const found = await getLeadByPreviewId(id);
  if (!found) return NextResponse.json({ error: "not found" }, { status: 404 });

  const host = new URL(req.url).origin;
  return NextResponse.json({
    ...previewResponse(host, found.lead.id, found.preview.id),
    business: found.lead.business,
    stage: found.lead.stage,
    previewUrl: found.preview.url,
    version: found.preview.version,
    status: found.preview.status,
  });
}
