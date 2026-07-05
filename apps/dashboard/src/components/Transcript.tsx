import type { Conversation } from "@nutz/phillip";
import { m, useReducedMotion } from "motion/react";
import { clockTime } from "../lib/analytics";
import { container, item } from "../motion";

export function Transcript({ conversation }: { conversation?: Conversation }) {
  const reduce = useReducedMotion() ?? false;

  if (!conversation || conversation.messages.length === 0) {
    return <p className="transcript-empty">No conversation yet — Phillip is still watching.</p>;
  }

  return (
    <m.div
      className="transcript"
      variants={container(reduce, 0.045)}
      initial="initial"
      animate="animate"
    >
      {conversation.messages.map((msg) => (
        <m.div key={msg.id} className={`bubble-row ${msg.role}`} variants={item(reduce)}>
          <span className={`bubble ${msg.role}`}>{msg.text}</span>
          <span className="bubble-time tnum">{clockTime(msg.ts)}</span>
        </m.div>
      ))}
    </m.div>
  );
}
