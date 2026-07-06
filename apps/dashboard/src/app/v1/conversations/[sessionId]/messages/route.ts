import type { Message } from "@nutz/phillip";
import { NextResponse } from "next/server";
import { appendMessages } from "../../../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface MessagesIngest {
  messages: Message[];
  intent?: string;
  sentiment?: string;
}

// Observability push: agents post the conversation (as it happens) so the team
// can read the full transcript in the dashboard. This is the dashboard's own
// ingestion contract — distinct from the embed's SSE chat endpoint, which is
// served by the conversational backend.
export async function POST(req: Request, { params }: { params: { sessionId: string } }) {
  let body: MessagesIngest;
  try {
    body = (await req.json()) as MessagesIngest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!Array.isArray(body?.messages)) {
    return NextResponse.json({ error: "messages[] required" }, { status: 400 });
  }
  const dl = appendMessages(params.sessionId, body.messages, {
    intent: body.intent,
    sentiment: body.sentiment,
  });
  return NextResponse.json(dl, { status: 201 });
}
