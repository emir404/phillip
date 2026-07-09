import { m, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "../chat/Avatar";
import {
  Conversation,
  ConversationContent,
  Message as ElMessage,
  Loader,
  MessageContent,
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  Suggestion,
  Suggestions,
  Task,
  type TaskPhase,
} from "../elements";
import type { Message } from "../intent/types";
import { ITERATION_OPTIONS } from "../iteration";
import { exitTween, spring } from "../overlay/motion";
import type { Persona } from "../types/boot";
import type { ElementTarget } from "../types/records";
import { Close, Crosshair, Dismiss } from "../ui/icons";
import { type MorphCustom, type Rect, railEnter, railExit, railFinalRect } from "./morph";
import { attachPicker } from "./picker";

// The iteration takeover (Figma 39:70): the lead's site framed live on the
// left, a dark chat rail on the right. The frame is a same-origin iframe of
// the page itself — when a build lands, swapping `frameSrc` re-keys it and the
// lead watches their site update in place, Lovable-style. `mount()` refuses to
// boot inside this frame (name check), so the widget never recurses.
//
// Children are positioned absolutely (not flex) so the rail's final box is
// analytic — the stage→rail morph tweens between two known rects without
// re-laying-out the iframe pane every frame.

export const PREVIEW_FRAME_NAME = "phillip-preview";

export interface TakeoverProps {
  persona: Persona;
  business: string;
  messages: Message[];
  streaming: boolean;
  frameSrc: string;
  /** Build status block; null hides the task row. */
  taskPhase: TaskPhase | null;
  taskSummary?: string;
  /** Guided chips, shown until the first build kicks off. */
  showSuggestions: boolean;
  busy: boolean;
  /** The floating stage's box at switch time — the morph's starting rect. */
  stageRect: Rect | null;
  onSubmit: (text: string, target?: ElementTarget) => void;
  onClose: () => void;
}

const backdrop = (reduce: boolean) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: reduce ? { duration: 0.12 } : { duration: 0.28 } },
  exit: { opacity: 0, transition: exitTween },
});

// The site pane settles in just after the rail starts moving, so the eye
// follows the morph first and the frame second.
const frameVariants = (reduce: boolean) => ({
  initial: reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 },
  animate: reduce
    ? { opacity: 1, transition: { duration: 0.12 } }
    : { opacity: 1, scale: 1, transition: { ...spring.snappy, delay: 0.12 } },
  exit: { opacity: 0, transition: exitTween },
});

export function Takeover({
  persona,
  business,
  messages,
  streaming,
  frameSrc,
  taskPhase,
  taskSummary,
  showSuggestions,
  busy,
  stageRect,
  onSubmit,
  onClose,
}: TakeoverProps) {
  const reduce = useReducedMotion() ?? false;
  // The rail's destination box, frozen at mount so enter/exit agree on it.
  const [final] = useState(railFinalRect);
  const railRef = useRef<HTMLDivElement | null>(null);
  // While morphing, the rail's content is pinned to its final width so text
  // never re-wraps mid-flight (the outer clip crops the first frames).
  const [innerW, setInnerW] = useState<number | null>(stageRect && !reduce ? final.width : null);
  const enter = railEnter(stageRect, final, reduce);

  // --- element picker -------------------------------------------------------
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [pickerOn, setPickerOn] = useState(false);
  const [canPick, setCanPick] = useState(false);
  const [target, setTarget] = useState<ElementTarget | null>(null);
  // Bumped on every iframe load — the picker re-attaches to the new document
  // (the initial about:blank swaps for the real one; builds re-key the frame).
  const [loadTick, setLoadTick] = useState(0);

  // Same-origin check without throwing at render time; cross-origin frames
  // simply hide the toggle.
  const getDoc = () => {
    try {
      return frameRef.current?.contentDocument ?? null;
    } catch {
      return null;
    }
  };

  // A re-keyed frame or an in-flight build drops picking mode.
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate resets on src/busy changes
  useEffect(() => {
    setPickerOn(false);
  }, [frameSrc, busy]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadTick re-attaches across document swaps
  useEffect(() => {
    if (!pickerOn) return;
    const doc = getDoc();
    if (!doc?.body) {
      setPickerOn(false);
      return;
    }
    const detach = attachPicker(doc, {
      onPick: (picked) => {
        setTarget(picked);
        setPickerOn(false);
        railRef.current?.querySelector("textarea")?.focus();
      },
      onCancel: () => setPickerOn(false),
    });
    // Esc must work when focus sits in the rail, not just inside the frame.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOn(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      detach();
    };
  }, [pickerOn, loadTick]);

  // The takeover owns the viewport — freeze the page behind it and hand the
  // scroll back exactly as it was.
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prev;
    };
  }, []);

  // Once the morph lands, hand sizing back to the responsive CSS slot.
  const settle = () => {
    const s = railRef.current?.style;
    s?.removeProperty("width");
    s?.removeProperty("height");
    setInnerW(null);
  };

  return (
    <m.div
      className="fixed inset-0 z-[40] bg-ink-950"
      // biome-ignore lint/a11y/useSemanticElements: motion-choreographed takeover; native <dialog> top-layer fights the shadow-root + AnimatePresence exit
      role="dialog"
      aria-modal="true"
      aria-label={`editing ${business}'s site`}
      variants={backdrop(reduce)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* The site, live, in a rounded frame — hidden on small screens where
          the rail takes the whole viewport. */}
      <m.div
        className="absolute inset-y-4 left-4 right-[432px] overflow-clip rounded-2xl bg-ink-900 max-md:hidden"
        variants={frameVariants(reduce)}
      >
        <iframe
          key={frameSrc}
          ref={frameRef}
          name={PREVIEW_FRAME_NAME}
          src={frameSrc}
          title={`${business} preview`}
          className="h-full w-full border-0 bg-white"
          onLoad={() => {
            setLoadTick((t) => t + 1);
            setCanPick(Boolean(getDoc()?.body));
          }}
        />
        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-950/40">
            <div className="flex items-center gap-2.5 rounded-full bg-ink-900/90 px-4 py-2 text-[13px] text-white/85 shadow-lg">
              <Loader />
              rebuilding…
            </div>
          </div>
        ) : null}
      </m.div>

      {/* The rail: same conversation, dark renderer, build status inline. It
          enters by morphing out of the floating stage's box and, on a
          build-less close, glides back to it. */}
      <m.div
        ref={railRef}
        className="absolute top-4 right-4 bottom-4 w-[400px] overflow-clip rounded-2xl bg-ink-900 shadow-[0px_0px_12px_0px_rgba(0,0,0,0.15)] max-md:left-4 max-md:w-auto"
        initial={enter.initial}
        animate={enter.animate}
        variants={{ exit: (c?: MorphCustom) => railExit(c, final) }}
        exit="exit"
        onAnimationComplete={settle}
      >
        <div className="flex h-full flex-col" style={innerW ? { width: innerW } : undefined}>
          <div className="flex items-center gap-2.5 p-4 pb-2">
            <Avatar persona={persona} size="xs" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-white/90">{persona.name}</div>
              <div className="truncate text-[11px] text-white/50">{persona.title}</div>
            </div>
            <button
              type="button"
              aria-label="close editor"
              onClick={onClose}
              className="grid size-6 place-items-center rounded-full border border-[#191919] bg-ink-700 text-white/80 shadow-[inset_0px_4px_4px_0px_rgba(0,0,0,0.15)] drop-shadow-[0px_4px_6px_rgba(0,0,0,0.15)] transition hover:text-white"
            >
              <Close size={14} />
            </button>
          </div>

          <Conversation className="min-h-0 flex-1">
            <ConversationContent>
              {messages.map((msg) =>
                msg.role === "system" ? (
                  <div key={msg.id} className="self-center text-[11px] text-white/40">
                    {msg.text}
                  </div>
                ) : (
                  <ElMessage key={msg.id} from={msg.role === "lead" ? "user" : "assistant"}>
                    <MessageContent dark>{msg.text}</MessageContent>
                  </ElMessage>
                ),
              )}
              {streaming ? (
                <div className="flex items-center gap-2 px-1 py-0.5 text-white/50">
                  <Loader size={12} />
                </div>
              ) : null}
              {taskPhase ? <Task phase={taskPhase} summary={taskSummary} /> : null}
            </ConversationContent>
          </Conversation>

          <div className="flex flex-col gap-2 p-4 pt-2">
            {showSuggestions ? (
              <Suggestions>
                {ITERATION_OPTIONS.map((o) => (
                  <Suggestion
                    key={o.id}
                    label={o.label}
                    onClick={() => onSubmit(o.label)}
                    disabled={busy}
                  />
                ))}
              </Suggestions>
            ) : null}
            {pickerOn ? (
              <div className="px-1 text-[11px] text-white/45">
                click any part of your site — esc cancels
              </div>
            ) : null}
            <PromptInput
              onSubmit={(text) => {
                onSubmit(text, target ?? undefined);
                setTarget(null);
              }}
              disabled={busy}
            >
              {target ? (
                <div className="flex items-center gap-1.5 self-start rounded-md bg-brand-600/15 px-2 py-1 text-[11px] text-brand-300">
                  <Crosshair size={11} />
                  <span className="max-w-[240px] truncate">
                    {target.text ? `${target.tag} · “${target.text}”` : target.selector}
                  </span>
                  <button
                    type="button"
                    aria-label="clear picked element"
                    onClick={() => setTarget(null)}
                    className="text-brand-300/70 transition hover:text-brand-300"
                  >
                    <Dismiss size={10} />
                  </button>
                </div>
              ) : null}
              <PromptInputTextarea
                autoFocus={!busy}
                placeholder={target ? "what should change about this?" : undefined}
              />
              <PromptInputToolbar
                leading={
                  canPick ? (
                    <button
                      type="button"
                      aria-label="pick an element"
                      aria-pressed={pickerOn}
                      disabled={busy}
                      onClick={() => setPickerOn((on) => !on)}
                      className={
                        pickerOn
                          ? "grid size-7 place-items-center rounded-full bg-brand-600/20 text-brand-300 transition disabled:opacity-40"
                          : "grid size-7 place-items-center rounded-full text-white/45 transition hover:text-white/85 disabled:opacity-40"
                      }
                    >
                      <Crosshair size={14} />
                    </button>
                  ) : undefined
                }
              >
                <PromptInputSubmit disabled={busy} />
              </PromptInputToolbar>
            </PromptInput>
          </div>
        </div>
      </m.div>
    </m.div>
  );
}
