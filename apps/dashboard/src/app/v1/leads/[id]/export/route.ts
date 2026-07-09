import { NextResponse } from "next/server";
import { agentFeed } from "../../../../../lib/metrics";
import { getLead } from "../../../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The agent-ready brief for a single lead — what a build agent needs to iterate
// or rebuild this one site.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dl = await getLead(id);
  if (!dl) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(agentFeed(dl));
}
