import { NextResponse } from "next/server";
import { type LeadUpsert, getLeads, upsertLead } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read: the dashboard polls this for live data.
export function GET() {
  return NextResponse.json(getLeads());
}

// Ingest: the Build agent (or the embed on boot) registers/updates a lead, its
// preview, and the session here.
export async function POST(req: Request) {
  let body: LeadUpsert;
  try {
    body = (await req.json()) as LeadUpsert;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body?.lead?.id || !body?.lead?.business || !body?.session?.id) {
    return NextResponse.json(
      { error: "lead.id, lead.business and session.id are required" },
      { status: 400 },
    );
  }
  const dl = upsertLead(body);
  return NextResponse.json(dl, { status: 201 });
}
