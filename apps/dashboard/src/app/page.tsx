import Dashboard from "../components/Dashboard";
import { getLeads } from "../lib/store";

// Server component: read straight from the store (no HTTP round-trip) for the
// first paint, then the client keeps it live by polling /v1/leads.
export const dynamic = "force-dynamic";

export default function Page() {
  const leads = getLeads();
  return <Dashboard initialLeads={leads} />;
}
