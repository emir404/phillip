import type { Persona } from "../types/boot";

// The resting bottom-right bubble. Closed and calm, with a soft pulse once
// Phillip is ready to speak.
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
    <button
      type="button"
      className={pulse ? "bubble pulse" : "bubble"}
      onClick={onClick}
      aria-label={`chat with ${persona.name}`}
    >
      <img src={persona.avatarUrl} alt={persona.name} />
      {pulse ? <span className="bubble-badge" /> : null}
    </button>
  );
}
