// Phase 07 — Setup & onboarding (STUB). Payment is not the finish line: Phillip
// becomes a setup guide so the customer ends with a live site. Real impl
// provisions the production site, connects DNS + issues SSL, collects missing
// assets, and creates the account. v0 just walks the checklist.

export interface SetupStep {
  id: string;
  label: string;
}

export const SETUP_STEPS: SetupStep[] = [
  { id: "domain", label: "connect a domain (or buy one through us)" },
  { id: "logo", label: "confirm your logo" },
  { id: "photos", label: "confirm photos" },
  { id: "hours", label: "confirm hours & contact" },
  { id: "approve", label: "final approval" },
];

export async function completeStep(_id: string): Promise<{ ok: boolean }> {
  // TODO: provision/site, DNS + SSL, collect assets, create account, send login.
  return { ok: true };
}
