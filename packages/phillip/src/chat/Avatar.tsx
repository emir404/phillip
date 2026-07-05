import { type HTMLMotionProps, m } from "motion/react";
import type { Persona } from "../types/boot";

// Now: a still photo. Next: a looping video. Later: real-time AI video.
// A motion element so it inherits enter/stagger from whatever container it sits
// in (the nudge, the bubble intro). Extra motion props pass straight through.
export function Avatar({
  persona,
  size = "sm",
  ...rest
}: { persona: Persona; size?: "sm" | "xs" } & HTMLMotionProps<"img">) {
  return <m.img className={`avatar ${size}`} src={persona.avatarUrl} alt={persona.name} {...rest} />;
}
