import { describe, expect, it } from "vitest";
import { createSSEDecoder, readSSE, toStreamEvent } from "./sse";

function streamFrom(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      const c = chunks[i++];
      if (c === undefined) controller.close();
      else controller.enqueue(enc.encode(c));
    },
  });
}

describe("createSSEDecoder", () => {
  it("parses a single complete frame", () => {
    const d = createSSEDecoder();
    const events = d.push('event: delta\ndata: {"text":"hi"}\n\n');
    expect(events).toEqual([{ event: "delta", data: '{"text":"hi"}', id: undefined }]);
  });

  it("buffers a frame split across chunks", () => {
    const d = createSSEDecoder();
    expect(d.push("event: del")).toEqual([]);
    expect(d.push('ta\ndata: {"text":"')).toEqual([]);
    const events = d.push('a"}\n\n');
    expect(events).toHaveLength(1);
    expect(events[0]?.event).toBe("delta");
    expect(events[0]?.data).toBe('{"text":"a"}');
  });

  it("joins multi-line data with newlines", () => {
    const d = createSSEDecoder();
    const [ev] = d.push("data: line1\ndata: line2\n\n");
    expect(ev?.data).toBe("line1\nline2");
  });

  it("ignores comments and handles CRLF", () => {
    const d = createSSEDecoder();
    const events = d.push(": keep-alive\r\nevent: done\r\ndata: {}\r\n\r\n");
    expect(events).toHaveLength(1);
    expect(events[0]?.event).toBe("done");
  });

  it("flushes a trailing unterminated frame", () => {
    const d = createSSEDecoder();
    expect(d.push("event: done\ndata: {}")).toEqual([]);
    const flushed = d.flush();
    expect(flushed[0]?.event).toBe("done");
  });
});

describe("toStreamEvent", () => {
  it("parses JSON data into a typed event", () => {
    expect(toStreamEvent({ event: "delta", data: '{"text":"yo"}' })).toEqual({
      type: "delta",
      data: { text: "yo" },
    });
  });

  it("returns null for unknown event types", () => {
    expect(toStreamEvent({ event: "mystery", data: "{}" })).toBeNull();
  });

  it("preserves the start_iteration hint payload", () => {
    expect(
      toStreamEvent({ event: "start_iteration", data: '{"hint":"change the name to Emir\'s"}' }),
    ).toEqual({
      type: "start_iteration",
      data: { hint: "change the name to Emir's" },
    });
  });

  it("tolerates non-JSON delta payloads", () => {
    expect(toStreamEvent({ event: "delta", data: "plain" })).toEqual({
      type: "delta",
      data: { text: "plain" },
    });
  });
});

describe("readSSE", () => {
  it("yields typed events across arbitrary chunk splits", async () => {
    const stream = streamFrom([
      'event: meta\ndata: {"conv',
      'ersationId":"c1"}\n\nevent: delta\nda',
      'ta: {"text":"he"}\n\n',
      'event: delta\ndata: {"text":"llo"}\n\nevent: done\ndata: {}\n\n',
    ]);
    const out: unknown[] = [];
    for await (const ev of readSSE(stream)) out.push(ev);
    expect(out).toEqual([
      { type: "meta", data: { conversationId: "c1" } },
      { type: "delta", data: { text: "he" } },
      { type: "delta", data: { text: "llo" } },
      { type: "done", data: {} },
    ]);
  });
});
