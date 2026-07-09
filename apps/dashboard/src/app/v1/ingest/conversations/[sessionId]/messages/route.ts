import type { Message } from "@nutz/phillip";
import { NextResponse } from "next/server";
import { appendMessages } from "../../../../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface MessagesIngest {
  messages: Message[];
  intent?: string;
  sentiment?: string;
}

// Observability push for external agents (auto mode): POST a finished
// transcript so the team reads it in the dashboard. Key-gated — this is the
// dashboard's own ingestion contract, distinct from the embed's SSE chat
// endpoint at /v1/conversations/:sessionId/messages.
export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  if (
    req.headers.get("x-api-key") !== process.env.PHILLIP_API_KEY ||
    !process.env.PHILLIP_API_KEY
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { sessionId } = await params;
  let body: MessagesIngest;
  try {
    body = (await req.json()) as MessagesIngest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!Array.isArray(body?.messages)) {
    return NextResponse.json({ error: "messages[] required" }, { status: 400 });
  }
  const dl = await appendMessages(sessionId, body.messages, {
    intent: body.intent,
    sentiment: body.sentiment,
  });
  return NextResponse.json(dl, { status: 201 });
}
