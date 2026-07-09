import { type Variants, m, useReducedMotion } from "motion/react";
import { widgetCopy } from "../i18n";
import { exitTween, itemVariants, press, spring, staggerChildren } from "../overlay/motion";
import type { Persona } from "../types/boot";
import { Dismiss } from "../ui/icons";
import { Avatar } from "./Avatar";

// A resting "peek" that sits beside the bubble while the conversation is closed.
// The bubble is Phillip's face; this is the speech bubble coming off it — a
// named, online person saying something specific, not a faceless "chat with us"
// widget. It enters with blur + opacity + position and its rows stagger in.
function nudgeVariants(reduce: boolean): Variants {
  if (reduce) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.14 } },
      exit: { opacity: 0, transition: { duration: 0.12 } },
    };
  }
  return {
    initial: { opacity: 0, x: 16, y: 8, scale: 0.94, filter: "blur(8px)" },
    animate: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: { ...spring.snappy, staggerChildren, delayChildren: 0.06 },
    },
    exit: { opacity: 0, x: 16, scale: 0.96, filter: "blur(6px)", transition: exitTween },
  };
}

export function Nudge({
  persona,
  message,
  onOpen,
  onDismiss,
}: {
  persona: Persona;
  message: string;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const copy = widgetCopy(persona.language);
  return (
    <m.div
      className="nudge"
      variants={nudgeVariants(reduce)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <m.button
        type="button"
        className="nudge-card"
        onClick={onOpen}
        aria-label={copy.openChat(persona.name)}
        variants={itemVariants(reduce)}
        whileHover={{ y: -2 }}
        whileTap={press}
      >
        <Avatar persona={persona} size="xs" />
        <span className="nudge-text">
          <span className="nudge-head">
            <span className="nudge-name">{persona.name}</span>
            <span className="nudge-live">
              <span className="nudge-live-dot" />
              {copy.online}
            </span>
          </span>
          <span className="nudge-msg">{message}</span>
        </span>
      </m.button>
      <m.button
        type="button"
        className="nudge-dismiss"
        onClick={onDismiss}
        aria-label={copy.dismiss}
        variants={itemVariants(reduce)}
        whileTap={press}
      >
        <Dismiss size={12} />
      </m.button>
    </m.div>
  );
}
