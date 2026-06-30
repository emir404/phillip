import { m, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { panelVariants, press, tapTransition } from "../overlay/motion";
import type { Persona } from "../types/boot";
import { Close } from "../ui/icons";
import { Avatar } from "./Avatar";

// The open conversation card. Header (Phillip's face + name + title) stays
// fixed; `children` is the scrollable message area; `footer` holds the quick
// replies / composer / iteration controls outside the scroll.
export function Panel({
  persona,
  onClose,
  children,
  footer,
}: {
  persona: Persona;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const reduce = useReducedMotion() ?? false;
  return (
    <m.div
      className="panel"
      // biome-ignore lint/a11y/useSemanticElements: a chat popover, not a modal <dialog>
      role="dialog"
      aria-label={`chat with ${persona.name}`}
      variants={panelVariants(reduce)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="panel-header">
        <Avatar persona={persona} size="sm" />
        <div className="panel-id">
          <span className="panel-name">{persona.name}</span>
          <span className="panel-title">{persona.title}</span>
        </div>
        <span className="panel-status">
          <span className="dot" /> online
        </span>
        <m.button
          type="button"
          className="panel-close"
          onClick={onClose}
          aria-label="close"
          whileTap={press}
          transition={tapTransition}
        >
          <Close size={18} />
        </m.button>
      </div>
      <div className="panel-body">{children}</div>
      {footer}
    </m.div>
  );
}
