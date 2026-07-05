import type { Persona } from "../types/boot";

// Now: a still photo. Next: a looping video. Later: real-time AI video.
export function Avatar({ persona, size = "sm" }: { persona: Persona; size?: "sm" | "xs" }) {
  return <img className={`avatar ${size}`} src={persona.avatarUrl} alt={persona.name} />;
}
