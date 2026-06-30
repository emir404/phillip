import type { Message as Msg } from "../intent/types";
import type { Persona } from "../types/boot";
import { Avatar } from "./Avatar";

export function Message({ message, persona }: { message: Msg; persona: Persona }) {
  if (message.role === "system") {
    return (
      <div className="msg system">
        <div className={message.error ? "msg-bubble error" : "msg-bubble"}>{message.text}</div>
      </div>
    );
  }
  return (
    <div className={`msg ${message.role}`}>
      {message.role === "phillip" ? <Avatar persona={persona} size="xs" /> : null}
      <div className={message.error ? "msg-bubble error" : "msg-bubble"}>{message.text}</div>
    </div>
  );
}
