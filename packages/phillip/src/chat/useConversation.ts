import { useRef, useState } from "react";
import type { Tracker } from "../analytics";
import { defaultGreeting, reactionQuickReplies, widgetCopy } from "../i18n";
import type { Conversation, Intent, Message, QuickReply, Sentiment } from "../intent/types";
import { prefixedId } from "../lib/id";
import { log } from "../lib/log";
import type { TransportClient } from "../transport";
import type { SendMessageRequest } from "../transport";
import type { Persona } from "../types/boot";

// Control events carry the backend's payload through — `hint` is the lead's
// concrete change request, so the iteration flow never has to re-ask.
export type ControlEvent =
  | { type: "start_iteration"; hint?: string }
  | { type: "escalate"; reason?: string }
  | { type: "open_checkout" };

export interface UseConversationOptions {
  client: TransportClient;
  sessionId: string;
  persona: Persona;
  business: string;
  tracker: Tracker;
  initial?: Conversation;
  onIntent?: (intent: Intent, sentiment?: Sentiment) => void;
  onControl?: (control: ControlEvent) => void;
}

export interface ConversationApi {
  messages: Message[];
  streaming: boolean;
  quickReplies: QuickReply[];
  send: (input: { text?: string; quickReply?: QuickReply }) => void;
  appendSystem: (text: string, error?: boolean) => void;
  appendPhillip: (text: string, extra?: { href?: string }) => void;
  retryLast: () => void;
}

const nowIso = (): string => new Date().toISOString();

function greeting(persona: Persona, business: string): Message {
  const text = persona.greeting ?? defaultGreeting(persona.name, business, persona.language);
  return { id: prefixedId("msg"), role: "phillip", text, ts: nowIso() };
}

export function useConversation(opts: UseConversationOptions): ConversationApi {
  const { client, sessionId, persona, business, tracker } = opts;

  const [messages, setMessages] = useState<Message[]>(() => {
    const initial = opts.initial?.messages ?? [];
    if (initial.length === 0) return [greeting(persona, business)];
    // Histories persisted before the boot-time greeting existed start with the
    // lead — prepend the greeting so the transcript still opens with the agent.
    return initial[0]?.role === "phillip" ? initial : [greeting(persona, business), ...initial];
  });
  const [streaming, setStreaming] = useState(false);
  // The three reaction doors greet every open — fresh, greeting-seeded, and
  // resumed threads alike. Only a thread left mid-turn (the lead's message is
  // still unanswered) opens without them; each send clears them and the server
  // proposes the next set.
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>(() => {
    const initial = opts.initial?.messages ?? [];
    const last = initial[initial.length - 1];
    return !last || last.role === "phillip" ? reactionQuickReplies(persona.language) : [];
  });

  const streamingRef = useRef(false);
  const lastReqRef = useRef<SendMessageRequest | null>(null);
  const intentRef = useRef<Intent | undefined>(undefined);
  const sentimentRef = useRef<Sentiment | undefined>(undefined);
  const convIdRef = useRef<string | undefined>(undefined);

  const appendSystem = (text: string, error = false): void => {
    setMessages((m) => [
      ...m,
      { id: prefixedId("msg"), role: "system", text, ts: nowIso(), error },
    ]);
  };

  // Agent-side messages that aren't streamed (e.g. iteration playback / "done").
  // `href` makes the bubble tappable — used for "done — tap to see it".
  const appendPhillip = (text: string, extra?: { href?: string }): void => {
    setMessages((m) => [
      ...m,
      { id: prefixedId("msg"), role: "phillip", text, ts: nowIso(), href: extra?.href },
    ]);
  };

  async function runStream(req: SendMessageRequest): Promise<void> {
    setStreaming(true);
    streamingRef.current = true;
    lastReqRef.current = req;
    intentRef.current = undefined;
    sentimentRef.current = undefined;
    let phillipId: string | null = null;

    try {
      for await (const ev of client.streamMessage(sessionId, req)) {
        switch (ev.type) {
          case "meta":
            convIdRef.current = ev.data.conversationId;
            break;
          case "intent":
            intentRef.current = ev.data.intent;
            opts.onIntent?.(ev.data.intent, sentimentRef.current);
            break;
          case "sentiment":
            sentimentRef.current = ev.data.sentiment;
            break;
          case "delta": {
            const chunk = ev.data.text;
            if (!phillipId) {
              const id = prefixedId("msg");
              phillipId = id;
              setMessages((m) => [
                ...m,
                { id, role: "phillip", text: chunk, ts: nowIso(), streaming: true },
              ]);
            } else {
              const id = phillipId;
              setMessages((m) => m.map((x) => (x.id === id ? { ...x, text: x.text + chunk } : x)));
            }
            break;
          }
          case "propose_quick_replies":
            setQuickReplies(ev.data.quickReplies);
            break;
          case "start_iteration":
            opts.onControl?.({ type: "start_iteration", hint: ev.data.hint });
            break;
          case "escalate":
            opts.onControl?.({ type: "escalate", reason: ev.data.reason });
            break;
          case "open_checkout":
            opts.onControl?.({ type: "open_checkout" });
            break;
          case "done":
            break;
        }
      }

      if (phillipId) {
        const id = phillipId;
        setMessages((m) =>
          m.map((x) =>
            x.id === id
              ? {
                  ...x,
                  streaming: false,
                  intent: intentRef.current,
                  sentiment: sentimentRef.current,
                }
              : x,
          ),
        );
        tracker.track("message_received", { messageId: id });
      }
    } catch (err) {
      log.warn("stream failed", err);
      appendSystem(widgetCopy(persona.language).streamFailed, true);
    } finally {
      setStreaming(false);
      streamingRef.current = false;
    }
  }

  const send: ConversationApi["send"] = (input) => {
    if (streamingRef.current) return;
    const text = (input.text ?? input.quickReply?.label ?? "").trim();
    if (!text) return;

    const leadMsg: Message = { id: prefixedId("msg"), role: "lead", text, ts: nowIso() };
    setMessages((m) => [...m, leadMsg]);
    setQuickReplies([]);
    tracker.track("message_sent", {
      messageId: leadMsg.id,
      viaQuickReply: Boolean(input.quickReply),
    });

    void runStream({
      message: input.quickReply ? undefined : text,
      quickReplyId: input.quickReply?.id,
    });
  };

  const retryLast = (): void => {
    if (streamingRef.current || !lastReqRef.current) return;
    void runStream(lastReqRef.current);
  };

  return { messages, streaming, quickReplies, send, appendSystem, appendPhillip, retryLast };
}
