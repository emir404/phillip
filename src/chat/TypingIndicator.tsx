import type { Persona } from "../types/boot";
import { Avatar } from "./Avatar";

export function TypingIndicator({ persona }: { persona: Persona }) {
  return (
    <div className="msg phillip">
      <Avatar persona={persona} size="xs" />
      <div className="typing" aria-label={`${persona.name} is typing`}>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
