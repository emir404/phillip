"use client";

import { clockTime } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { container, item } from "@/motion";
import type { Conversation, Message } from "@nutz/phillip";
import { m, useReducedMotion } from "motion/react";

function MessageChips({ msg }: { msg: Message }) {
  if (!msg.intent && !msg.sentiment) return null;
  return (
    <span className="flex gap-1">
      {msg.intent ? (
        <span className="rounded-full border px-1.5 py-px text-[10px] text-muted-foreground">
          {msg.intent}
        </span>
      ) : null}
      {msg.sentiment ? (
        <span className="rounded-full border px-1.5 py-px text-[10px] text-muted-foreground">
          {msg.sentiment}
        </span>
      ) : null}
    </span>
  );
}

export function Transcript({
  conversation,
  className,
}: {
  conversation?: Conversation;
  className?: string;
}) {
  const reduce = useReducedMotion() ?? false;

  if (!conversation || conversation.messages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No conversation yet — Phillip is still watching.
      </p>
    );
  }

  return (
    <m.div
      className={cn("flex max-h-96 flex-col gap-3 overflow-y-auto pr-1", className)}
      variants={container(reduce, 0.045)}
      initial="initial"
      animate="animate"
    >
      {conversation.messages.map((msg) => {
        const isLead = msg.role === "lead";
        const isSystem = msg.role === "system";
        return (
          <m.div
            key={msg.id}
            className={cn(
              "flex max-w-[85%] flex-col gap-1",
              isSystem
                ? "self-center items-center"
                : isLead
                  ? "self-end items-end"
                  : "self-start items-start",
            )}
            variants={item(reduce)}
          >
            <span
              className={cn(
                "px-3 py-2 text-sm leading-relaxed",
                isSystem
                  ? "rounded-full bg-muted py-1 text-center text-xs text-muted-foreground"
                  : isLead
                    ? "rounded-[18px] rounded-br-[4px] [background:var(--gradient-brand)] text-white"
                    : "rounded-[18px] rounded-bl-[4px] bg-[#e9e9ea] text-black dark:bg-[#26262b] dark:text-white",
              )}
            >
              {msg.text}
            </span>
            <span className="flex items-center gap-1.5 px-1">
              <MessageChips msg={msg} />
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {clockTime(msg.ts)}
              </span>
            </span>
          </m.div>
        );
      })}
    </m.div>
  );
}
