import { describe, expect, it } from "vitest";
import type { Persona } from "../types/boot";
import { composePreview, previewTitle } from "./preview";

const persona: Persona = {
  name: "Phillip",
  title: "Design partner",
  avatarUrl: "https://example.com/p.png",
};

describe("composePreview", () => {
  it("prefers the persona greeting when present", () => {
    const withGreeting: Persona = { ...persona, greeting: "hey there 👋" };
    expect(composePreview("score", withGreeting)).toBe("hey there 👋");
    expect(composePreview("exit_intent", withGreeting)).toBe("hey there 👋");
  });

  it("composes a reason-aware line when there is no greeting", () => {
    expect(composePreview("exit_intent", persona)).toMatch(/before you go/i);
    expect(composePreview("score", persona)).toMatch(/caught your eye/i);
    expect(composePreview("fallback", persona)).toContain("phillip");
  });
});

describe("previewTitle", () => {
  it("uses the persona name", () => {
    expect(previewTitle(persona)).toBe("Phillip");
  });
});
