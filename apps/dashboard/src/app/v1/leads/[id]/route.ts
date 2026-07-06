import { NextResponse } from "next/server";
import { getLead } from "../../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(_req: Request, { params }: { params: { id: string } }) {
  const dl = getLead(params.id);
  if (!dl) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(dl);
}
