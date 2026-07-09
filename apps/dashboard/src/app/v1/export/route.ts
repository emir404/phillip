import { NextResponse } from "next/server";
import { agentFeed, aggregateInsights } from "../../../lib/metrics";
import { getLeads } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The agent feed: every lead distilled into an agent-ready brief + metrics +
// attention heatmap, plus book-wide insights. This is the endpoint downstream
// build agents pull from to mass-produce sites.
//
//   GET /v1/export              → { generatedAt, insights, leads: [...] }
//   GET /v1/export?format=ndjson → one AgentFeedItem per line (stream-friendly)
//   GET /v1/export?stage=paid   → only leads at/deeper than a given stage
export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = url.searchParams.get("format");
  const leads = await getLeads();
  const feeds = leads.map(agentFeed);

  if (format === "ndjson" || format === "jsonl") {
    const body = `${feeds.map((f) => JSON.stringify(f)).join("\n")}\n`;
    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": "application/x-ndjson; charset=utf-8",
        "content-disposition": 'attachment; filename="phillip-agent-feed.ndjson"',
      },
    });
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    insights: aggregateInsights(leads),
    leads: feeds,
  });
}
