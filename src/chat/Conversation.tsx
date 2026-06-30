import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef } from "react";
import { usePhillip } from "../core/PhillipProvider";
import type { Message as Msg } from "../intent/types";
import { staggerChildren } from "../overlay/motion";
import { Message } from "./Message";
import { TypingIndicator } from "./TypingIndicator";

// Parent only orchestrates timing; it has no visual change of its own. Children
// (Message) inherit the "initial"/"animate" variant labels and resolve them
// from their own variants, so the whole list staggers in together on open and
// each newly-appended message rises in on arrival.
const listOrchestration = {
  initial: {},
  animate: { transition: { staggerChildren } },
};

// The scrollable message list. Typing shows while we're awaiting Phillip's first
// token; once it streams in, the growing message replaces it. Persona comes from
// the shared runtime rather than props.
export function Conversation({ messages, streaming }: { messages: Msg[]; streaming: boolean }) {
  const { config } = usePhillip();
  const persona = config.persona;
  const endRef = useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1];
  const showTyping = streaming && last?.role !== "phillip";

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-scroll on any new content
  useEffect(() => {
    // optional-call: jsdom (tests) has no scrollIntoView
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages, showTyping]);

  return (
    <m.div className="convo" variants={listOrchestration} initial="initial" animate="animate">
      <AnimatePresence initial={false}>
        {messages.map((msg) => (
          <Message key={msg.id} message={msg} persona={persona} />
        ))}
      </AnimatePresence>
      {showTyping ? <TypingIndicator persona={persona} /> : null}
      <div ref={endRef} />
    </m.div>
  );
}
