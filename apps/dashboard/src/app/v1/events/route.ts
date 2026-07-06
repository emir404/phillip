import type { AnalyticsEvent } from "@nutz/phillip";
import { NextResponse } from "next/server";
import { saveEvents } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface EventsBatch {
  sessionId: string;
  events: AnalyticsEvent[];
}

// The embed's silent analytics land here (POST {apiBase}/v1/events). Same wire
// shape as the embed's EventsBatchRequest, so pointing a live embed's apiBase at
// this deploy persists its behaviour stream verbatim.
export async function POST(req: Request) {
  let body: EventsBatch;
  try {
    body = (await req.json()) as EventsBatch;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body?.sessionId || !Array.isArray(body.events)) {
    return NextResponse.json({ error: "sessionId and events[] required" }, { status: 400 });
  }
  saveEvents(body.sessionId, body.events);
  // The embed only checks for a 2xx (sendEvents is fire-and-forget).
  return new NextResponse(null, { status: 204 });
}
