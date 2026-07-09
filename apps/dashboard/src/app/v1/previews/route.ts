import { LANGUAGES, isLanguage } from "@nutz/phillip/i18n";
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
  setupAmountCents?: number;
  monthlyAmountCents?: number;
  language?: string;
}

/** Omitted = inherit the global pricing. Present = must be whole, non-negative cents. */
const validCents = (v: unknown): boolean =>
  v === undefined || (typeof v === "number" && Number.isInteger(v) && v >= 0);

/** Omitted = inherit the global persona's language. Present = a code we have copy for. */
const validLanguage = (v: unknown): boolean => v === undefined || isLanguage(v);

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
  if (!validCents(body.setupAmountCents) || !validCents(body.monthlyAmountCents)) {
    return NextResponse.json(
      { error: "setupAmountCents/monthlyAmountCents must be non-negative integers" },
      { status: 400 },
    );
  }
  if (!validLanguage(body.language)) {
    return NextResponse.json(
      { error: `language must be one of: ${LANGUAGES.join(", ")}` },
      { status: 400 },
    );
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
      setupAmountCents: body.setupAmountCents,
      monthlyAmountCents: body.monthlyAmountCents,
      language: isLanguage(body.language) ? body.language : undefined,
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
