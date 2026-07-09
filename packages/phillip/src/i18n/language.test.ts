import { describe, expect, it } from "vitest";
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  coerceLanguage,
  defaultGreeting,
  isLanguage,
  quickReplyText,
  reactionQuickReplies,
} from "./language";

describe("coerceLanguage", () => {
  it("passes through a language we have copy for", () => {
    expect(coerceLanguage("de")).toBe("de");
  });

  // The persona row predates the setting, and a lead's override is nullable —
  // both arrive here as absent rather than as a code.
  it("falls back rather than throwing on absent or unknown input", () => {
    expect(coerceLanguage(undefined)).toBe(DEFAULT_LANGUAGE);
    expect(coerceLanguage(null)).toBe(DEFAULT_LANGUAGE);
    expect(coerceLanguage("klingon")).toBe(DEFAULT_LANGUAGE);
  });

  it("honours an explicit fallback — a lead inherits the persona, not English", () => {
    expect(coerceLanguage(null, "nl")).toBe("nl");
    expect(coerceLanguage("fr", "nl")).toBe("fr");
  });
});

describe("isLanguage", () => {
  it("accepts every listed code and nothing else", () => {
    for (const l of LANGUAGES) expect(isLanguage(l)).toBe(true);
    expect(isLanguage("klingon")).toBe(false);
    expect(isLanguage("")).toBe(false);
    expect(isLanguage(undefined)).toBe(false);
  });
});

describe("defaultGreeting", () => {
  it("keeps English in the brand's all-lowercase texting register", () => {
    expect(defaultGreeting("Phillip", "Marisol's", "en")).toBe(
      "hey, i'm phillip. i built this one for Marisol's. honest take — what do you think?",
    );
  });

  it("defaults to English when no language is given", () => {
    expect(defaultGreeting("Phillip", "Marisol's")).toBe(
      defaultGreeting("Phillip", "Marisol's", "en"),
    );
  });

  it("names the business and the persona in every language", () => {
    for (const l of LANGUAGES) {
      const line = defaultGreeting("Phillip", "Forge Barbers", l);
      expect(line).toContain("Forge Barbers");
      expect(line.toLowerCase()).toContain("phillip");
    }
  });

  // All-lowercase German reads as a typo, not as style.
  it("does not force lowercase outside English", () => {
    for (const l of LANGUAGES.filter((x) => x !== "en")) {
      const line = defaultGreeting("Phillip", "Forge Barbers", l);
      expect(line).not.toBe(line.toLowerCase());
    }
  });
});

describe("quickReplyText", () => {
  it("returns the words the lead actually read", () => {
    expect(quickReplyText("qr_love", "en")).toBe("love it");
    expect(quickReplyText("qr_love", "de")).toBe("Gefällt mir");
    expect(quickReplyText("opt_photos", "fr")).toBe("Les photos");
  });

  it("is undefined for an id nobody renders", () => {
    expect(quickReplyText("qr_nope", "en")).toBeUndefined();
  });
});

describe("reactionQuickReplies", () => {
  it("keeps ids and intents stable across languages — only labels translate", () => {
    const en = reactionQuickReplies("en");
    const de = reactionQuickReplies("de");
    expect(en.map((q) => q.id)).toEqual(["qr_love", "qr_but", "qr_no"]);
    expect(de.map((q) => q.id)).toEqual(en.map((q) => q.id));
    expect(de.map((q) => q.intent)).toEqual(["positive", "iterate", "objection"]);
    expect(de.map((q) => q.label)).toEqual(["Gefällt mir", "Gut, aber…", "Eher nicht"]);
  });

  // A chip tapped in Dutch must resolve back to the same words on the server,
  // or the transcript records something the lead never saw.
  it("agrees with quickReplyText for every language", () => {
    for (const l of LANGUAGES) {
      for (const qr of reactionQuickReplies(l)) {
        expect(quickReplyText(qr.id, l)).toBe(qr.label);
      }
    }
  });
});
