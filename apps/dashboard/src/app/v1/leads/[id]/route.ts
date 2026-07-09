import { NextResponse } from "next/server";
import { deleteBlockedReason, purgeLead } from "../../../../lib/leads";
import { getLead, getLeadRow } from "../../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dl = await getLead(id);
  if (!dl) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(dl);
}

// Same rules as the dashboard's delete button — both go through purgeLead, so
// the "never tear down a customer's own Vercel project" guard can't be missed
// on one path and honoured on the other.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLeadRow(id);
  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });

  const blocked = deleteBlockedReason(lead);
  if (blocked) return NextResponse.json({ error: blocked }, { status: 409 });

  await purgeLead(lead);
  return NextResponse.json({ ok: true });
}
