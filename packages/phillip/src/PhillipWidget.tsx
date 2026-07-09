import {
  AnimatePresence,
  LazyMotion,
  MotionConfig,
  domAnimation,
  useReducedMotion,
} from "motion/react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Tracker } from "./analytics/tracker";
import { Bubble } from "./chat/Bubble";
import { Composer } from "./chat/Composer";
import { Conversation } from "./chat/Conversation";
import { Nudge } from "./chat/Nudge";
import { QuickReplies } from "./chat/QuickReplies";
import { Stage } from "./chat/Stage";
import { type ControlEvent, useConversation } from "./chat/useConversation";
import { PhillipProvider } from "./core/PhillipProvider";
import type { RuntimeConfig } from "./core/config";
import { useBoot } from "./core/useBoot";
import type { TaskPhase } from "./elements";
import { FunnelEmitter } from "./funnel";
import type { Intent, Sentiment } from "./intent/types";
import { MAX_INLINE_ROUNDS, captureChangeSet, isHeavyRequest, useIteration } from "./iteration";
import { log } from "./lib/log";
import { applyThemeVars } from "./mount";
import { Vignette } from "./overlay/Vignette";
import {
  CheckoutPanel,
  EscalationPanel,
  SetupPanel,
  openCheckout,
  submitEscalation,
} from "./stubs";
import { Takeover } from "./takeover";
import { type Rect, captureRect } from "./takeover/morph";
import type { TransportClient } from "./transport";
import type { BootConfig } from "./types/boot";
import type { PingReason } from "./types/events";
import type { ElementTarget } from "./types/records";

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
  // Paid/live lead: the preview experience is over — mount nothing.
  if (boot.config.silent) return null;
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
  const reduce = useReducedMotion() ?? false;
  // Mirrors for values read inside long-lived async closures (SSE control
  // handlers, iteration onReady) — state reads there would be stale.
  const flowRef = useRef<Flow>("chat");
  const changeFlow = (next: Flow) => {
    flowRef.current = next;
    setFlow(next);
  };
  const roundRef = useRef(0);
  // The stage's box, snapshotted the instant the flow switches to iteration —
  // the takeover rail morphs out of (and back into) this rect.
  const stageElRef = useRef<HTMLDivElement | null>(null);
  const stageRectRef = useRef<Rect | null>(null);
  // Holds the stage back a beat when it reappears under the returning rail.
  const [stageEnterDelay, setStageEnterDelay] = useState(0);
  // Takeover state: what the site frame shows, the inline build status, the
  // last completed result (close navigates there so the page is never stale),
  // and the lead's last ask (the task's summary line).
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const [taskPhase, setTaskPhase] = useState<TaskPhase | null>(null);
  const lastResultRef = useRef<string | null>(null);
  const lastAskRef = useRef<string | undefined>(undefined);
  const [escalating, setEscalating] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  // The resting peek beside the bubble — held back for a beat on landing so the
  // lead sees the site first, then dismissible for the rest of the session.
  const [nudgeShown, setNudgeShown] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const openTriggerRef = useRef<PingReason | "manual">("manual");
  const openedRef = useRef(false);

  // A specific, human peek — names the person and their business, not "chat
  // with us". Lowercase, low-pressure, matches Phillip's voice.
  const peek = `hey, i'm ${config.persona.name.toLowerCase()} 👋 i built this one for ${config.lead.business} — got a sec?`;

  // Opening the floating conversation — from a ping or the resting bubble.
  const openConversation = (trigger: PingReason | "manual") => {
    openTriggerRef.current = trigger;
    setStageEnterDelay(0);
    setOpen(true);
  };

  // Phase 03: route the classified intent through the funnel.
  const onIntent = (intent: Intent, sentiment?: Sentiment) => {
    tracker.track("intent_classified", { intent, sentiment });
    funnel.to("reacted", intent);
    if (intent === "iterate") funnel.to("iterating", "iterate");
    else if (intent === "escalate") funnel.to("escalated", "escalate");
  };

  // Submit one concrete ask through the heavy/round-cap gate. Returns false
  // when it was diverted to escalation instead of building.
  const submitAsk = (text: string, target?: ElementTarget): boolean => {
    const changeSet = captureChangeSet([], text, target);
    if (isHeavyRequest(changeSet) || roundRef.current >= MAX_INLINE_ROUNDS) {
      convo.appendPhillip(
        "that's a bigger change and worth doing right. drop your email and my colleague will pick it up.",
      );
      funnel.to("escalated", "heavy_or_round_cap");
      changeFlow("escalation");
      return false;
    }
    lastAskRef.current = text;
    setTaskPhase("submitting");
    iteration.submit(changeSet);
    return true;
  };

  // Iteration entry — from a control event (with the backend's hint) or the
  // lead driving it by hand. Opens the takeover; with a hint the build starts
  // immediately: Phillip already acknowledged in his streamed reply, so
  // re-asking is forbidden.
  const startIteration = (hint?: string) => {
    if (!config.features.iteration) return;
    funnel.to("iterating", "control");
    // Measure BEFORE the flow flips — the stage is gone next render.
    stageRectRef.current = captureRect(stageElRef.current);
    setFrameSrc((src) => src ?? window.location.href);
    changeFlow("iteration");
    const trimmed = hint?.trim();
    if (!trimmed) return; // no concrete ask yet — the rail collects it
    submitAsk(trimmed);
  };

  // The backend drives which sub-flow opens via control events. Feature flags
  // from boot gate every flow — a disabled surface simply never opens.
  const onControl = (control: ControlEvent) => {
    if (control.type === "start_iteration") {
      startIteration(control.hint);
    } else if (control.type === "escalate") {
      if (!config.features.escalation) return;
      funnel.to("escalated", "control");
      changeFlow("escalation");
    } else if (control.type === "open_checkout") {
      if (!config.features.checkout) return;
      funnel.to("checkout", "control");
      changeFlow("checkout");
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
    sessionId: config.session.id,
    tracker,
    // Real builds take minutes, not seconds — poll gently for up to ~300s.
    pollIntervalMs: 2500,
    maxAttempts: 120,
    // In the takeover, the frame reloads to the new version in place; in the
    // floating chat, the new version arrives as a tappable destination.
    onReady: (job) => {
      if (job.resultUrl) lastResultRef.current = job.resultUrl;
      if (flowRef.current === "iteration") {
        setTaskPhase("done");
        if (job.resultUrl) setFrameSrc(job.resultUrl);
        return;
      }
      convo.appendPhillip(
        "done — tap to see it ✨",
        job.resultUrl ? { href: job.resultUrl } : undefined,
      );
    },
    onFailed: () => {
      if (flowRef.current === "iteration") {
        setTaskPhase("failed");
        return;
      }
      convo.appendSystem("hmm, that one didn't take. want to try again?", true);
    },
    onManual: () => {
      if (flowRef.current === "iteration") {
        setTaskPhase("manual");
        return;
      }
      convo.appendPhillip(
        "this one needs a human touch — my colleague is picking it up and will email you shortly.",
      );
    },
  });

  // Keep the ref in step for reads inside stale closures.
  useEffect(() => {
    roundRef.current = iteration.round;
  }, [iteration.round]);

  // The rail's prompt (and its suggestion chips) route through the same gate
  // the auto-submit path uses; the rail stays open showing the build status.
  // A picked element rides along as the change-set's target.
  const onRailSubmit = (text: string, target?: ElementTarget) => {
    const trimmed = text.trim();
    if (!trimmed || iteration.busy) return;
    submitAsk(trimmed, target);
  };

  // Leaving the takeover: if a build landed while it was open, walk the host
  // page to the fresh version — the lead just watched it, returning to the
  // stale one would be a lie. Otherwise simply drop back to the floating chat.
  const closeTakeover = () => {
    const landed = lastResultRef.current;
    if (landed && taskPhase === "done") {
      window.location.href = landed;
      return;
    }
    setTaskPhase(null);
    // The rail glides home first; the stage lands right behind it.
    setStageEnterDelay(0.15);
    changeFlow("chat");
  };

  // Phase 05 — Escalation (stub): capture + validate email, hand off.
  const onEscalate = (email: string) => {
    setEscalating(true);
    void submitEscalation(client, config.session.id, email).then((res) => {
      setEscalating(false);
      if (res.ok) {
        tracker.track("escalated", { email });
        convo.appendPhillip("sent. look out for a note from phillip@nutz.inc.");
        changeFlow("chat");
      } else {
        convo.appendSystem("that email looks off — mind checking it?", true);
      }
    });
  };

  // Phase 06 — Close & payment: hand off to Stripe's hosted page in a new tab.
  // The client never flips the funnel to paid — the payment webhook does, and
  // the next boot reflects it.
  const onPay = () => {
    setCheckingOut(true);
    tracker.track("checkout_started", {});
    void openCheckout(client, config.session.id)
      .then((res) => {
        if (res.checkoutUrl) {
          window.open(res.checkoutUrl, "_blank", "noopener");
          convo.appendPhillip(
            "i opened secure checkout in a new tab — i'll get everything live the moment it's done.",
          );
          changeFlow("chat");
        } else {
          convo.appendSystem("checkout didn't open — mind trying again?", true);
        }
      })
      .catch(() => {
        convo.appendSystem("checkout didn't open — mind trying again?", true);
      })
      .finally(() => setCheckingOut(false));
  };

  // Phase 07 — Setup (stub): walk the checklist, then go live.
  const onGoLive = () => {
    funnel.to("live", "setup_complete");
    convo.appendPhillip("you're live 🎉 i'll email your login.");
    changeFlow("chat");
  };

  useEffect(() => {
    // On ping, the floating conversation opens and Phillip's messages pop in
    // over the vignette — the messages themselves are the proactive nudge.
    // (setOpen / refs are stable, so this effect only depends on `tracker`.)
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

  // Let the site land first, then bring Phillip's peek in.
  useEffect(() => {
    const t = setTimeout(() => setNudgeShown(true), 1600);
    return () => clearTimeout(t);
  }, []);

  // Backend-driven theme tokens land as custom properties on .phillip-root.
  const themeAnchor = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const vars = config.theme;
    if (!vars || !themeAnchor.current) return;
    const rootEl = themeAnchor.current.closest(".phillip-root");
    if (rootEl instanceof HTMLElement) applyThemeVars(rootEl, vars);
  }, [config.theme]);

  const value = useMemo(
    () => ({ runtime, client, config, tracker }),
    [runtime, client, config, tracker],
  );

  let footer: ReactNode;
  if (flow === "escalation") {
    footer = (
      <div className="stage-card">
        <EscalationPanel
          busy={escalating}
          onSubmit={onEscalate}
          onCancel={() => changeFlow("chat")}
        />
      </div>
    );
  } else if (flow === "checkout") {
    footer = (
      <div className="stage-card">
        <CheckoutPanel
          offer={config.offer}
          busy={checkingOut}
          onPay={onPay}
          onCancel={() => changeFlow("chat")}
        />
      </div>
    );
  } else if (flow === "setup") {
    footer = (
      <div className="stage-card">
        <SetupPanel onComplete={onGoLive} />
      </div>
    );
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
      {/* `strict` forbids accidental full-`motion.*` use; `domAnimation` is the
          lean feature set (enter/exit, gestures, variants, reduced-motion) we
          bundle into the drop-in. reducedMotion="user" honors the OS setting. */}
      <LazyMotion features={domAnimation} strict>
        <MotionConfig reducedMotion="user">
          <span ref={themeAnchor} style={{ display: "none" }} aria-hidden />
          {/* The glow backs the conversation whenever the floating chat is
              open; the takeover carries its own backdrop. */}
          <AnimatePresence>
            {open && flow !== "iteration" ? <Vignette key="vignette" /> : null}
          </AnimatePresence>
          {/* Floating transcript ⇄ full takeover, overlapping in ONE presence
              (no mode="wait") so the exit and enter play together — the rail
              morphs out of the stage's box and glides back into it. `custom`
              feeds the exiting side the latest rect + direction. */}
          <AnimatePresence
            custom={{
              stageRect: stageRectRef.current,
              toIteration: flow === "iteration",
              reduce,
            }}
          >
            {open && flow === "iteration" ? (
              <Takeover
                key="takeover"
                persona={config.persona}
                business={config.lead.business}
                messages={convo.messages}
                streaming={convo.streaming}
                frameSrc={frameSrc ?? window.location.href}
                taskPhase={taskPhase}
                taskSummary={lastAskRef.current}
                showSuggestions={iteration.round === 0 && !taskPhase && !convo.streaming}
                busy={iteration.busy}
                stageRect={stageRectRef.current}
                onSubmit={onRailSubmit}
                onClose={closeTakeover}
              />
            ) : null}
            {open && flow !== "iteration" ? (
              <Stage
                key="stage"
                persona={config.persona}
                onClose={() => setOpen(false)}
                footer={footer}
                footerKey={flow}
                stageRef={stageElRef}
                enterDelay={stageEnterDelay}
              >
                <Conversation messages={convo.messages} streaming={convo.streaming} />
              </Stage>
            ) : null}
          </AnimatePresence>
          <AnimatePresence>
            {open || nudgeDismissed || !nudgeShown ? null : (
              <Nudge
                key="nudge"
                persona={config.persona}
                message={peek}
                onOpen={() => openConversation("manual")}
                onDismiss={() => setNudgeDismissed(true)}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {open ? null : (
              <Bubble
                key="bubble"
                persona={config.persona}
                pulse={nudgeShown && !nudgeDismissed}
                onClick={() => openConversation("manual")}
              />
            )}
          </AnimatePresence>
        </MotionConfig>
      </LazyMotion>
    </PhillipProvider>
  );
}
