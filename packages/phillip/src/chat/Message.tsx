import { m, useReducedMotion } from "motion/react";
import type { Message as Msg } from "../intent/types";
import { messageVariants } from "../overlay/motion";

// A single iMessage-style bubble. No per-message avatar (iMessage doesn't show
// one), and `tail` is true only on the last bubble of a consecutive run — the
// tail is a mask-shaped span painting the bubble's background (see .msg-tail
// in styles.ts), so it reads on any backdrop and can share the transcript-wide
// gradient field with its bubble (we float over the vignette, not a card).
export function Message({ message, tail }: { message: Msg; tail: boolean }) {
  const reduce = useReducedMotion() ?? false;
  // One-shot entrance only — driven off mount, never re-triggered as a Phillip
  // message streams in token-by-token. Variant labels are inherited from the
  // Conversation parent so the list staggers; we don't set initial/animate here.
  const variants = messageVariants(reduce);

  if (message.role === "system") {
    return (
      <m.div className="msg system" variants={variants}>
        <div className={message.error ? "msg-bubble error" : "msg-bubble"}>{message.text}</div>
      </m.div>
    );
  }
  // A bubble with an href is a real destination ("done — tap to see it") —
  // whole-bubble tap navigates the host page there.
  const linked = Boolean(message.href);
  const goto = () => {
    if (message.href) window.location.href = message.href;
  };

  return (
    <m.div className={`msg ${message.role}${tail ? " has-tail" : ""}`} variants={variants}>
      <div className="msg-bubble-wrap">
        {/* Tail lives inside the bubble (like the simulator) so it hangs below
            and insets from the corner. */}
        <div
          className={`msg-bubble${message.error ? " error" : ""}${linked ? " linked" : ""}`}
          role={linked ? "link" : undefined}
          tabIndex={linked ? 0 : undefined}
          onClick={linked ? goto : undefined}
          onKeyDown={linked ? (e) => (e.key === "Enter" || e.key === " ") && goto() : undefined}
        >
          {message.text}
          {tail ? <span className="msg-tail" aria-hidden="true" /> : null}
        </div>
      </div>
    </m.div>
  );
}
