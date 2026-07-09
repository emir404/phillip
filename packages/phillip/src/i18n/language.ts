// The language Phillip speaks to a lead — and every string he says that the
// model does not write himself.
//
// Ships as its own React-free entry (`@nutz/phillip/i18n`) because both sides
// need it: the widget renders the reaction chips, and the dashboard seeds the
// opening greeting and resolves a clicked chip id back to the exact words the
// lead saw. Defining the copy twice would let the two drift, and the drift is
// invisible — the server would log "love it" for a lead who tapped "Gefällt
// mir".

import type { Intent, QuickReply } from "../intent/types";

export const LANGUAGES = ["en", "de", "fr", "es", "it", "nl", "pt"] as const;

export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "en";

/** How the language names itself — for pickers a human reads. */
export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  nl: "Nederlands",
  pt: "Português",
};

/** The English name — for the sentence that tells the model what to speak. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  nl: "Dutch",
  pt: "Portuguese",
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

/**
 * Anything → a language we actually have copy for.
 *
 * Rows written before this feature carry no language at all, and a lead may
 * hold `null` to mean "inherit the global". Both land on English rather than
 * throwing: a preview that greets in the wrong language is a bug, one that
 * fails to boot is an outage.
 */
export function coerceLanguage(value: unknown, fallback: Language = DEFAULT_LANGUAGE): Language {
  return isLanguage(value) ? value : fallback;
}

// --- the copy Phillip says without asking the model -----------------------------

/**
 * The opening line — the only sentence Phillip ever says unprompted. Shared by
 * the server (persisted at boot) and the widget (offline/mock fallback) so the
 * copy can't drift.
 *
 * English is deliberately all-lowercase: that is the brand's texting register.
 * The other languages are not — all-lowercase German reads as a typo, not as
 * style — and they address the owner formally, because Phillip is a stranger
 * pitching a business. `systemPrompt()` in the dashboard tells the model to
 * keep both conventions for the rest of the thread.
 */
const GREETINGS: Record<Language, (name: string, business: string) => string> = {
  en: (name, business) =>
    `hey, i'm ${name.toLowerCase()}. i built this one for ${business}. honest take — what do you think?`,
  de: (name, business) =>
    `Hallo, ich bin ${name}. Diese Seite habe ich für ${business} gebaut. Ganz ehrlich — was halten Sie davon?`,
  fr: (name, business) =>
    `Bonjour, je suis ${name}. C'est moi qui ai conçu ce site pour ${business}. Franchement, qu'en pensez-vous ?`,
  es: (name, business) =>
    `Hola, soy ${name}. He diseñado este sitio para ${business}. Con sinceridad, ¿qué le parece?`,
  it: (name, business) =>
    `Ciao, sono ${name}. Questo sito l'ho creato io per ${business}. Sinceramente, che ne pensa?`,
  nl: (name, business) =>
    `Hallo, ik ben ${name}. Deze site heb ik voor ${business} gemaakt. Eerlijk gezegd — wat vindt u ervan?`,
  pt: (name, business) =>
    `Olá, sou o ${name}. Este site fui eu que criei para ${business}. Sinceramente, o que acha?`,
};

export function defaultGreeting(
  name: string,
  business: string,
  language: Language = DEFAULT_LANGUAGE,
): string {
  return GREETINGS[coerceLanguage(language)](name, business);
}

/**
 * Every chip the widget can render without the model having proposed one: the
 * three reaction doors, plus the iterate options the mock offers. Ids are the
 * wire contract — only the label is translated, so a chip tapped in Dutch
 * still classifies as `qr_love` on the server.
 */
export type QuickReplyId =
  | "qr_love"
  | "qr_but"
  | "qr_no"
  | "opt_colors"
  | "opt_copy"
  | "opt_photos";

const QUICK_REPLIES: Record<Language, Record<QuickReplyId, string>> = {
  en: {
    qr_love: "love it",
    qr_but: "looks good, but…",
    qr_no: "not feeling it",
    opt_colors: "the colors",
    opt_copy: "the words",
    opt_photos: "the photos",
  },
  de: {
    qr_love: "Gefällt mir",
    qr_but: "Gut, aber…",
    qr_no: "Eher nicht",
    opt_colors: "Die Farben",
    opt_copy: "Die Texte",
    opt_photos: "Die Fotos",
  },
  fr: {
    qr_love: "J'adore",
    qr_but: "Bien, mais…",
    qr_no: "Pas convaincu",
    opt_colors: "Les couleurs",
    opt_copy: "Les textes",
    opt_photos: "Les photos",
  },
  es: {
    qr_love: "Me encanta",
    qr_but: "Está bien, pero…",
    qr_no: "No me convence",
    opt_colors: "Los colores",
    opt_copy: "Los textos",
    opt_photos: "Las fotos",
  },
  it: {
    qr_love: "Mi piace",
    qr_but: "Bello, ma…",
    qr_no: "Non mi convince",
    opt_colors: "I colori",
    opt_copy: "I testi",
    opt_photos: "Le foto",
  },
  nl: {
    qr_love: "Mooi",
    qr_but: "Goed, maar…",
    qr_no: "Niet echt",
    opt_colors: "De kleuren",
    opt_copy: "De teksten",
    opt_photos: "De foto's",
  },
  pt: {
    qr_love: "Adorei",
    qr_but: "Está bom, mas…",
    qr_no: "Não me convence",
    opt_colors: "As cores",
    opt_copy: "Os textos",
    opt_photos: "As fotos",
  },
};

/** The words behind a chip id — what the lead read, so what the thread stores. */
export function quickReplyText(
  id: string,
  language: Language = DEFAULT_LANGUAGE,
): string | undefined {
  return QUICK_REPLIES[coerceLanguage(language)][id as QuickReplyId];
}

const REACTION_INTENTS: { id: QuickReplyId; intent: Intent }[] = [
  { id: "qr_love", intent: "positive" },
  { id: "qr_but", intent: "iterate" },
  { id: "qr_no", intent: "objection" },
];

/** The three doors at the reaction step, in the lead's language. */
export function reactionQuickReplies(language: Language = DEFAULT_LANGUAGE): QuickReply[] {
  const lang = coerceLanguage(language);
  return REACTION_INTENTS.map(({ id, intent }) => ({
    id,
    label: QUICK_REPLIES[lang][id],
    intent,
  }));
}
