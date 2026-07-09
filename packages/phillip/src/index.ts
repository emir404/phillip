// Public React entry. Tree-shakeable (sideEffects:false) — importing this does
// not mount anything; render <Phillip/> or call mount() to do that.

export { Phillip, Phillip as PreviewAgent } from "./Phillip";
export type { PhillipProps } from "./Phillip";
export { mount } from "./mount";
export type { MountOptions } from "./mount";
// Default engagement tuning — the dashboard's boot route serves this verbatim.
export { DEFAULT_ENGAGEMENT } from "./engagement/weights";
// The language Phillip speaks, and every line he says that the model doesn't write.
export {
  coerceLanguage,
  DEFAULT_LANGUAGE,
  defaultGreeting,
  isLanguage,
  LANGUAGE_LABELS,
  LANGUAGE_NAMES,
  LANGUAGES,
  type Language,
  type QuickReplyId,
  quickReplyText,
  reactionQuickReplies,
} from "./i18n/language";
export { type WidgetCopy, widgetCopy } from "./i18n/copy";
export type * from "./types";
