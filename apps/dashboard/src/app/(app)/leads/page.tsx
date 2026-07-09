import { LeadsView } from "@/components/leads/leads-view";

// Data comes from the layout-level LiveLeadsProvider (server-seeded, polled);
// this page is a pure client consumer, so navigation here is instant.
export const dynamic = "force-dynamic";

export default function LeadsPage() {
  return <LeadsView />;
}
