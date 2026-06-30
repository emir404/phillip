import type { TransportClient } from "../transport";

// Phase 05 — Escalation (STUB). When the ask is bigger than a tweak, Phillip
// hands off to the Email agent. v0 validates the email and pings the endpoint;
// the real impl creates the email thread and spins up the async Email agent
// with everything Phillip already knows.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export interface EscalationResult {
  ok: boolean;
}

export async function submitEscalation(
  client: TransportClient,
  sessionId: string,
  email: string,
): Promise<EscalationResult> {
  if (!isValidEmail(email)) return { ok: false };
  // TODO: create the email thread + spin up the Email agent with full context;
  // flip CRM stage to escalated.
  return client.escalate({ sessionId, email: email.trim() });
}
