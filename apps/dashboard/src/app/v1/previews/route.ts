import { NextResponse } from "next/server";
import { InvalidRepoError, createLeadWithPreview, previewResponse } from "../../../lib/previews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CreatePreviewBody {
  business?: string;
  contact?: string;
  email?: string;
  industry?: string;
  source?: string;
  siteUrl?: string;
  vercelProjectId?: string;
  files?: { path: string; content: string }[];
  repoUrl?: string;
}

// Auto mode: the build agent registers the site it just generated and gets
// back the preview id + the exact snippet to embed. Key-gated, server-to-server.
export async function POST(req: Request) {
  if (
    !process.env.PHILLIP_API_KEY ||
    req.headers.get("x-api-key") !== process.env.PHILLIP_API_KEY
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: CreatePreviewBody;
  try {
    body = (await req.json()) as CreatePreviewBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body?.business?.trim()) {
    return NextResponse.json({ error: "business required" }, { status: 400 });
  }
  if (body.files && !body.files.every((f) => f?.path && typeof f.content === "string")) {
    return NextResponse.json({ error: "files must be [{path, content}]" }, { status: 400 });
  }

  let created: { leadId: string; previewId: string };
  try {
    created = await createLeadWithPreview({
      business: body.business.trim(),
      contact: body.contact,
      email: body.email,
      industry: body.industry,
      source: body.source ?? "build-agent",
      siteUrl: body.siteUrl,
      vercelProjectId: body.vercelProjectId,
      files: body.files,
      repoUrl: body.repoUrl,
    });
  } catch (err) {
    if (err instanceof InvalidRepoError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const host = new URL(req.url).origin;
  return NextResponse.json(previewResponse(host, created.leadId, created.previewId), {
    status: 201,
  });
}
