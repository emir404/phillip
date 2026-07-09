import { CORS_HEADERS } from "./cors";

// Wire format the embed's SSE parser reads (packages/phillip/src/transport/sse.ts):
// `event: <type>\ndata: <json>\n\n` — same serializer the mock backend uses.
const enc = new TextEncoder();

export function frame(event: string, data: unknown): Uint8Array {
  return enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export const SSE_HEADERS: Record<string, string> = {
  ...CORS_HEADERS,
  "content-type": "text/event-stream; charset=utf-8",
  // no-transform + the nginx hint keep proxies from buffering the stream.
  "cache-control": "no-cache, no-transform",
  connection: "keep-alive",
  "x-accel-buffering": "no",
};
