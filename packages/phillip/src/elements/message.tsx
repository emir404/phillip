// Vendored from AI SDK Elements' Message, decoupled from UIMessage: `from`
// flows to MessageContent via context so call sites keep Elements' two-level
// composition (<Message from=…><MessageContent>…) without repeating the role.
import { type HTMLAttributes, createContext, useContext } from "react";
import { cn } from "../lib/cn";

export type MessageRole = "user" | "assistant";

const MessageContext = createContext<MessageRole>("assistant");

export interface MessageProps extends HTMLAttributes<HTMLDivElement> {
  from: MessageRole;
}

export function Message({ from, className, children, ...props }: MessageProps) {
  return (
    <MessageContext.Provider value={from}>
      <div
        data-from={from}
        className={cn("flex w-full", from === "user" ? "justify-end" : "justify-start", className)}
        {...props}
      >
        {children}
      </div>
    </MessageContext.Provider>
  );
}

export interface MessageContentProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Dark-rail variant: assistant bubbles sit on ink surfaces instead of the
   * light iMessage gray. User bubbles are the brand gradient either way.
   */
  dark?: boolean;
}

export function MessageContent({ dark = false, className, ...props }: MessageContentProps) {
  const from = useContext(MessageContext);
  return (
    <div
      className={cn(
        // 18px bubble with the tail-side corner tightened, iMessage-style.
        "max-w-[85%] wrap-break-word rounded-[18px] px-3.5 py-2 text-[15px] leading-snug whitespace-pre-wrap",
        from === "user"
          ? "rounded-br-[4px] bg-gradient-to-b from-brand-300 to-brand-600 text-white"
          : ["rounded-bl-[4px]", dark ? "bg-ink-850 text-white/90" : "bg-them text-black"],
        className,
      )}
      {...props}
    />
  );
}
