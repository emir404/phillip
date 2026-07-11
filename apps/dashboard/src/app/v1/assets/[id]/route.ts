import { getAsset } from "../../../../lib/assets";
import { CORS_HEADERS, preflight } from "../../../../lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

// Serves an attachment a lead uploaded (via /v1/iterations) at the URL the
// executor was told to reference in an <img> tag — same-origin as the rest
// of the widget's API, so the lead's own site can embed it directly.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await getAsset(id);
  if (!asset) return new Response("not found", { status: 404, headers: CORS_HEADERS });

  const bytes = Buffer.from(asset.bytesBase64, "base64");
  return new Response(bytes, {
    headers: {
      ...CORS_HEADERS,
      "content-type": asset.mediaType,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
