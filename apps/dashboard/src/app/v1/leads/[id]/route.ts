import { NextResponse } from "next/server";
import { getLead } from "../../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dl = await getLead(id);
  if (!dl) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(dl);
}
