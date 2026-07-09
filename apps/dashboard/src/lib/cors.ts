import { NextResponse } from "next/server";

// Embed-facing /v1 routes run on lead-site origins, so they answer any origin.
// That's safe here because the capability is the unguessable prv_/ses_ id and
// none of these routes read cookies.
export const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type,accept",
  "access-control-max-age": "86400",
};

export function corsJson(data: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, {
    ...init,
    headers: { ...CORS_HEADERS, ...(init?.headers as Record<string, string> | undefined) },
  });
}

export function corsEmpty(status = 204): Response {
  return new Response(null, { status, headers: CORS_HEADERS });
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
