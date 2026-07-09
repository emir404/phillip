import { Overview } from "@/components/overview";

// The (app) layout seeds LiveLeadsProvider from the store and keeps it polling;
// the overview is a pure consumer of that context.
export const dynamic = "force-dynamic";

export default function Page() {
  return <Overview />;
}
