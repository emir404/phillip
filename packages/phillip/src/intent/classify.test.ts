import { describe, expect, it } from "vitest";
import { classifyQuickReply, classifyText } from "./classify";

describe("classifyQuickReply", () => {
  it("uses the quick reply's declared intent", () => {
    expect(classifyQuickReply({ id: "qr_love", label: "love it", intent: "positive" })).toBe(
      "positive",
    );
    expect(classifyQuickReply({ id: "x", label: "x" })).toBe("unknown");
  });
});

describe("classifyText", () => {
  it("routes asks for a human / bigger scope to escalation", () => {
    expect(classifyText("can i talk to someone?").intent).toBe("escalate");
    expect(classifyText("do you support online booking?").intent).toBe("escalate");
  });

  it("routes tweak requests to iterate", () => {
    expect(classifyText("can you make the colors warmer").intent).toBe("iterate");
    expect(classifyText("swap the hero photo please").intent).toBe("iterate");
  });

  it("reads enthusiasm as positive", () => {
    expect(classifyText("love it, make it live").intent).toBe("positive");
  });

  it("reads displeasure as an objection", () => {
    const r = classifyText("honestly this looks bad");
    expect(r.intent).toBe("objection");
    expect(r.sentiment).toBe("negative");
  });

  it("falls back to unknown", () => {
    expect(classifyText("hello there").intent).toBe("unknown");
  });
});
