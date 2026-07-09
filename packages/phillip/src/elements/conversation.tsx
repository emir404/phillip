// Vendored from AI SDK Elements' Conversation (elements.ai-sdk.dev), decoupled
// from useChat/StickToBottom: a plain scroll container that keeps itself pinned
// to the newest message via an end-anchor div, mirroring src/chat/Conversation.
import { type HTMLAttributes, useEffect, useRef } from "react";
import { cn } from "../lib/cn";

export type ConversationProps = HTMLAttributes<HTMLDivElement>;

export function Conversation({ className, children, ...props }: ConversationProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-scroll on any new content
  useEffect(() => {
    // optional-call: jsdom (tests) has no scrollIntoView
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [children]);

  return (
    <div role="log" className={cn("flex flex-col overflow-y-auto", className)} {...props}>
      {children}
      <div ref={endRef} aria-hidden="true" />
    </div>
  );
}

export type ConversationContentProps = HTMLAttributes<HTMLDivElement>;

export function ConversationContent({ className, ...props }: ConversationContentProps) {
  return <div className={cn("flex flex-col gap-2 p-4", className)} {...props} />;
}
