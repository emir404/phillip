// Vendored Elements — presentational, Tailwind-classed chat primitives adapted
// from AI SDK Elements' compositional API (elements.ai-sdk.dev), decoupled
// from useChat/ai-sdk/lucide. Driven by Phillip's own hooks; rendered inside
// the widget's shadow root (tailwind.generated.ts carries their CSS).
export { Conversation, ConversationContent } from "./conversation";
export type { ConversationContentProps, ConversationProps } from "./conversation";
export { Loader } from "./loader";
export type { LoaderProps } from "./loader";
export { Message, MessageContent } from "./message";
export type { MessageContentProps, MessageProps, MessageRole } from "./message";
export {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
} from "./prompt-input";
export type {
  PromptInputProps,
  PromptInputSubmitProps,
  PromptInputTextareaProps,
  PromptInputToolbarProps,
} from "./prompt-input";
export { Suggestion, Suggestions } from "./suggestion";
export type { SuggestionProps, SuggestionsProps } from "./suggestion";
export { Task } from "./task";
export type { TaskPhase, TaskProps } from "./task";
