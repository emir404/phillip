import { IterationsTable } from "@/components/iterations-table";
import { listIterations } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function IterationsPage() {
  const rows = await listIterations();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Iterations</h1>
        <p className="text-sm text-muted-foreground">
          Every edit round the agents ran — and the ones waiting on you.
        </p>
      </header>
      <IterationsTable rows={rows} />
    </div>
  );
}
