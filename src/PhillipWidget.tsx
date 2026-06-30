import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Tracker } from "./analytics/tracker";
import { Bubble } from "./chat/Bubble";
import { Composer } from "./chat/Composer";
import { Conversation } from "./chat/Conversation";
import { Panel } from "./chat/Panel";
import { QuickReplies } from "./chat/QuickReplies";
import { type ControlEvent, useConversation } from "./chat/useConversation";
import { PhillipProvider } from "./core/PhillipProvider";
import type { RuntimeConfig } from "./core/config";
import { useBoot } from "./core/useBoot";
import { FunnelEmitter } from "./funnel";
import type { Intent, Sentiment } from "./intent/types";
import {
  type IterationOption,
  IterationPanel,
  MAX_INLINE_ROUNDS,
  captureChangeSet,
  isHeavyRequest,
  useIteration,
} from "./iteration";
import { log } from "./lib/log";
import {
  CheckoutPanel,
  EscalationPanel,
  SetupPanel,
  openCheckout,
  submitEscalation,
} from "./stubs";
import type { TransportClient } from "./transport";
import type { BootConfig } from "./types/boot";
import type { PingReason } from "./types/events";

export interface PhillipWidgetProps {
  runtime: RuntimeConfig;
  client: TransportClient;
}

type Flow = "chat" | "iteration" | "escalation" | "checkout" | "setup";

// Top of the widget tree (this is the React root rendered *inside* the shadow
// root). Boots, then hands off to Ready once we have the config.
export function PhillipWidget({ runtime, client }: PhillipWidgetProps) {
  const boot = useBoot(runtime.previewId, client);

  if (boot.status === "loading") return null;
  if (boot.status === "error") {
    log.error("boot failed", boot.error);
    return null;
  }
  return <Ready runtime={runtime} client={client} config={boot.config} />;
}

function Ready({
  runtime,
  client,
  config,
}: {
  runtime: RuntimeConfig;
  client: TransportClient;
  config: BootConfig;
}) {
  // One tracker + funnel for the widget's lifetime.
  const trackerRef = useRef<Tracker | null>(null);
  if (!trackerRef.current) {
    trackerRef.current = new Tracker(config.session.id, config.engagement, client, {
      returningVisitor: config.session.returning,
    });
  }
  const tracker = trackerRef.current;

  const funnelRef = useRef<FunnelEmitter | null>(null);
  if (!funnelRef.current) {
    funnelRef.current = new FunnelEmitter(tracker, config.lead.stage);
  }
  const funnel = funnelRef.current;

  const [open, setOpen] = useState(false);
  const [flow, setFlow] = useState<Flow>("chat");
  const [escalating, setEscalating] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const openTriggerRef = useRef<PingReason | "manual">("manual");
  const openedRef = useRef(false);

  // Phase 03: route the classified intent through the funnel.
  const onIntent = (intent: Intent, sentiment?: Sentiment) => {
    tracker.track("intent_classified", { intent, sentiment });
    funnel.to("reacted", intent);
    if (intent === "iterate") funnel.to("iterating", "iterate");
    else if (intent === "escalate") funnel.to("escalated", "escalate");
  };

  // The backend drives which sub-flow opens via control events.
  const onControl = (control: ControlEvent) => {
    if (control.type === "start_iteration") {
      funnel.to("iterating", "control");
      setFlow("iteration");
    } else if (control.type === "escalate") {
      funnel.to("escalated", "control");
      setFlow("escalation");
    } else if (control.type === "open_checkout") {
      funnel.to("checkout", "control");
      setFlow("checkout");
    }
  };

  const convo = useConversation({
    client,
    sessionId: config.session.id,
    persona: config.persona,
    business: config.lead.business,
    tracker,
    initial: config.conversation,
    onIntent,
    onControl,
  });

  const iteration = useIteration({
    client,
    previewId: config.preview.id,
    tracker,
    onReady: () => convo.appendPhillip("done — refresh to see it ✨"),
    onFailed: () => convo.appendSystem("hmm, that one didn't take. want to try again?", true),
  });

  // Phase 04 vs 05 split: heavy asks or too many inline rounds hand off.
  const onIterationSubmit = (selected: IterationOption[], freeText: string) => {
    const changeSet = captureChangeSet(selected, freeText);
    if (isHeavyRequest(changeSet) || iteration.round >= MAX_INLINE_ROUNDS) {
      convo.appendPhillip(
        "that's a bigger change and worth doing right. drop your email and my colleague will pick it up.",
      );
      funnel.to("escalated", "heavy_or_round_cap");
      setFlow("escalation");
      return;
    }
    const summary = [...selected.map((s) => s.label), freeText.trim()].filter(Boolean).join(", ");
    convo.appendPhillip(`got it — ${summary}. give me a sec.`);
    iteration.submit(changeSet);
    setFlow("chat");
  };

  // Phase 05 — Escalation (stub): capture + validate email, hand off.
  const onEscalate = (email: string) => {
    setEscalating(true);
    void submitEscalation(client, config.session.id, email).then((res) => {
      setEscalating(false);
      if (res.ok) {
        tracker.track("escalated", { email });
        convo.appendPhillip("sent. look out for a note from phillip@nutz.inc.");
        setFlow("chat");
      } else {
        convo.appendSystem("that email looks off — mind checking it?", true);
      }
    });
  };

  // Phase 06 — Close & payment (stub): simulate a successful purchase, then
  // move into setup.
  const onPay = () => {
    setCheckingOut(true);
    tracker.track("checkout_started", {});
    void openCheckout(client, config.session.id).then(() => {
      setCheckingOut(false);
      funnel.to("paid", "simulated");
      tracker.track("paid", {});
      convo.appendPhillip("payment received (simulated). let's get you set up.");
      setFlow("setup");
    });
  };

  // Phase 07 — Setup (stub): walk the checklist, then go live.
  const onGoLive = () => {
    funnel.to("live", "setup_complete");
    convo.appendPhillip("you're live 🎉 i'll email your login.");
    setFlow("chat");
  };

  useEffect(() => {
    // On ping, the bubble expands into the conversation (Phase 02).
    tracker.callbacks.onPing = (reason) => {
      openTriggerRef.current = reason;
      setOpen(true);
    };
    tracker.start();
    return () => tracker.stop();
  }, [tracker]);

  useEffect(() => {
    if (!open || openedRef.current) return;
    openedRef.current = true;
    tracker.track("conversation_opened", { trigger: openTriggerRef.current });
    funnel.to("engaged", "conversation_opened");
  }, [open, tracker, funnel]);

  const value = useMemo(
    () => ({ runtime, client, config, tracker }),
    [runtime, client, config, tracker],
  );

  let footer: ReactNode;
  if (flow === "iteration") {
    footer = (
      <IterationPanel
        busy={iteration.busy}
        onSubmit={onIterationSubmit}
        onCancel={() => setFlow("chat")}
      />
    );
  } else if (flow === "escalation") {
    footer = (
      <EscalationPanel busy={escalating} onSubmit={onEscalate} onCancel={() => setFlow("chat")} />
    );
  } else if (flow === "checkout") {
    footer = (
      <CheckoutPanel
        offer={config.offer}
        busy={checkingOut}
        onPay={onPay}
        onCancel={() => setFlow("chat")}
      />
    );
  } else if (flow === "setup") {
    footer = <SetupPanel onComplete={onGoLive} />;
  } else {
    footer = (
      <>
        <QuickReplies
          replies={convo.quickReplies}
          disabled={convo.streaming}
          onPick={(qr) => convo.send({ quickReply: qr })}
        />
        <Composer disabled={convo.streaming} onSend={(text) => convo.send({ text })} />
      </>
    );
  }

  return (
    <PhillipProvider value={value}>
      {open ? (
        <Panel persona={config.persona} onClose={() => setOpen(false)} footer={footer}>
          <Conversation messages={convo.messages} streaming={convo.streaming} />
        </Panel>
      ) : (
        <Bubble persona={config.persona} pulse onClick={() => setOpen(true)} />
      )}
    </PhillipProvider>
  );
}
