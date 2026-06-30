import { m, useReducedMotion } from "motion/react";
import type { Message as Msg } from "../intent/types";
import { messageVariants } from "../overlay/motion";
import type { Persona } from "../types/boot";
import { Avatar } from "./Avatar";

export function Message({ message, persona }: { message: Msg; persona: Persona }) {
  const reduce = useReducedMotion() ?? false;
  // One-shot entrance only — driven off mount, never re-triggered as a Phillip
  // message streams in token-by-token (no `layout`, which would jitter as the
  // bubble grows). Variant labels are inherited from the Conversation parent so
  // the list staggers; we don't set initial/animate here.
  const variants = messageVariants(reduce);

  if (message.role === "system") {
    return (
      <m.div className="msg system" variants={variants}>
        <div className={message.error ? "msg-bubble error" : "msg-bubble"}>{message.text}</div>
      </m.div>
    );
  }
  return (
    <m.div className={`msg ${message.role}`} variants={variants}>
      {message.role === "phillip" ? <Avatar persona={persona} size="xs" /> : null}
      <div className="msg-bubble-wrap">
        <div className={message.error ? "msg-bubble error" : "msg-bubble"}>{message.text}</div>
        {message.reaction ? <span className="msg-reaction">{message.reaction}</span> : null}
      </div>
    </m.div>
  );
}
