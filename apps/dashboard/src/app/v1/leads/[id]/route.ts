import { NextResponse } from "next/server";
import { deleteVercelProject } from "../../../../lib/executor";
import { deleteLead, getLead, getLeadRow } from "../../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dl = await getLead(id);
  if (!dl) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(dl);
}

// Same rules as the dashboard's delete button: everything about the lead goes,
// the preview deployment comes down, and real paying customers are refused.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLeadRow(id);
  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });
  if ((lead.stage === "paid" || lead.stage === "live") && !lead.testMode) {
    return NextResponse.json({ error: "lead has paid — refusing to delete" }, { status: 409 });
  }
  if (lead.vercelProjectId) {
    await deleteVercelProject(lead.vercelProjectId).catch(() => false);
  }
  await deleteLead(id);
  return NextResponse.json({ ok: true });
}
