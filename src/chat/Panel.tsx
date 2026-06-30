import type { ReactNode } from "react";
import type { Persona } from "../types/boot";
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
  return (
    // biome-ignore lint/a11y/useSemanticElements: a chat popover, not a modal <dialog>
    <div className="panel" role="dialog" aria-label={`chat with ${persona.name}`}>
      <div className="panel-header">
        <Avatar persona={persona} size="sm" />
        <div className="panel-id">
          <span className="panel-name">{persona.name}</span>
          <span className="panel-title">{persona.title}</span>
        </div>
        <span className="panel-status">
          <span className="dot" /> online
        </span>
        <button type="button" className="panel-close" onClick={onClose} aria-label="close">
          ×
        </button>
      </div>
      <div className="panel-body">{children}</div>
      {footer}
    </div>
  );
}
