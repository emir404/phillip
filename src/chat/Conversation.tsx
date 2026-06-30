import { useEffect, useRef } from "react";
import { usePhillip } from "../core/PhillipProvider";
import type { Message as Msg } from "../intent/types";
import { Message } from "./Message";
import { TypingIndicator } from "./TypingIndicator";

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
    <>
      {messages.map((m) => (
        <Message key={m.id} message={m} persona={persona} />
      ))}
      {showTyping ? <TypingIndicator persona={persona} /> : null}
      <div ref={endRef} />
    </>
  );
}
