import { corsJson, preflight } from "../../../lib/cors";
import {
  advanceLeadStage,
  createEscalation,
  getLeadRow,
  getVisitorSession,
  insertBackendEvent,
  updateLeadFields,
} from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

interface EscalationBody {
  sessionId: string;
  email: string;
  reason?: string;
}

// Heavy request or "I want a human": record it for the team queue and advance
// the funnel. The email thread itself is a human follow-up (v1.1 automates it).
export async function POST(req: Request) {
  let body: EscalationBody;
  try {
    body = (await req.json()) as EscalationBody;
  } catch {
    return corsJson({ error: "invalid json" }, { status: 400 });
  }
  if (!body?.sessionId || !body?.email?.includes("@")) {
    return corsJson({ error: "sessionId and a valid email required" }, { status: 400 });
  }

  const session = await getVisitorSession(body.sessionId);
  if (!session) return corsJson({ error: "unknown session" }, { status: 404 });

  await createEscalation({
    leadId: session.leadId,
    sessionId: body.sessionId,
    email: body.email,
    reason: body.reason,
  });
  const lead = await getLeadRow(session.leadId);
  if (lead && !lead.email) {
    await updateLeadFields(lead.id, { email: body.email });
  }
  await advanceLeadStage(session.leadId, "escalated");
  await insertBackendEvent(session.leadId, body.sessionId, "escalated", { email: body.email });

  return corsJson({ ok: true });
}
