import { m } from "motion/react";
import { hoverLift, press, spring, tapTransition } from "../overlay/motion";
import type { Persona } from "../types/boot";

// The resting bottom-right bubble. Calm by default — proactive engagement now
// lives in the notification layer, so this is purely the always-available entry
// point. A small static dot signals an unseen notification (no pulsing ring).
export function Bubble({
  persona,
  pulse,
  onClick,
}: {
  persona: Persona;
  pulse: boolean;
  onClick: () => void;
}) {
  return (
    <m.button
      type="button"
      className="bubble"
      onClick={onClick}
      aria-label={`chat with ${persona.name}`}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6, transition: tapTransition }}
      transition={spring.snappy}
      whileHover={hoverLift}
      whileTap={press}
    >
      <img src={persona.avatarUrl} alt={persona.name} />
      {pulse ? <span className="bubble-badge" /> : null}
    </m.button>
  );
}
