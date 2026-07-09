import { Overview } from "@/components/overview";
import { getLeads } from "@/lib/store";

// Server component: read straight from the store (no HTTP round-trip) for the
// first paint, then the client keeps it live by polling /v1/leads.
export const dynamic = "force-dynamic";

export default async function Page() {
  const leads = await getLeads();
  return <Overview initialLeads={leads} />;
}
