import type { Persona } from "../types/boot";
import type { PingReason } from "../types/events";

// The one-line teaser shown in a notification when Phillip pings. Persona's
// own greeting wins when present; otherwise we compose a short, reason-aware
// line in Phillip's lowercase, casual voice (matches the rest of the copy).
export function composePreview(reason: PingReason, persona: Persona): string {
  if (persona.greeting) return persona.greeting;
  switch (reason) {
    case "exit_intent":
      return "before you go — got a sec? i can tweak this for you.";
    case "score":
      return "looks like this caught your eye. want a hand?";
    default:
      return `hey, i'm ${persona.name.toLowerCase()} — want a quick look together?`;
  }
}

// Short label under the avatar in the notification (the "sender").
export function previewTitle(persona: Persona): string {
  return persona.name;
}
