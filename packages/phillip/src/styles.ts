// All widget CSS, exported as a string so it can be adopted into the shadow
// root identically across tsup, Vite, and Vitest (no CSS-loader coordination).
// Host page styles cannot reach in (shadow boundary) and ours cannot leak out;
// the `:host { all: initial }` reset also blocks inherited font/color bleed.
//
// Animation note: enter/exit motion lives in the components via the `motion`
// library (see src/overlay/motion.ts) so it stays interruptible. CSS keeps only
// genuinely ambient loops (the indeterminate spinner, the launcher's idle
// breathe) plus static styling.
//
// Layout note: there is no chat "box". The conversation is a FRAMELESS stack of
// iMessage bubbles floating over the bottom-right vignette. Bubbles carry their
// own soft shadow so they read on any backdrop; the tail is a mask-shaped span
// painting the bubble's own background, so it works without a solid surface
// behind it and can share the transcript-wide gradient field (see .msg-tail).

export const styles = `
:host { all: initial; }
:host {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 0;
  height: 0;
  z-index: 2147483647;
}

.phillip-root {
  all: initial;
  --p-bg: #ffffff;
  --p-fg: #18181b;
  --p-muted: #71717a;
  --p-line: #ececef;
  --p-accent: #18181b;
  --p-accent-fg: #ffffff;
  --p-soft: #f4f4f5;
  --p-pop: #ff4d8d;

  /* Brand blue — the sent-bubble gradient and every affirmative control.
     Shared with the takeover rail and the dashboard (one visual family). */
  --p-brand-a: #4ebaff;
  --p-brand-b: #0088ff;
  --p-brand-grad: linear-gradient(180deg, var(--p-brand-a), var(--p-brand-b));

  /* iMessage-shaped bubbles per the Figma spec: received #e9e9ea, sent brand
     gradient, 20px radius. */
  --p-them-bg: #e9e9ea;
  --p-them-fg: #000000;
  --p-bubble-radius: 20px;

  /* Frosted surfaces (composer, chips, sub-flow cards) — matches the repo's
     --ios-glass and its soft pill shadow. */
  --p-glass: rgba(247,247,247,.92);
  --p-glass-blur: 22px;
  --p-glass-ring: inset 0 0 0 1px rgba(255,255,255,.5);
  --p-glass-shadow: 0 0 0 .5px rgba(0,0,0,.04), 0 2px 6px -1px rgba(0,0,0,.06);

  /* Soft lift so bubbles + glass read over the dimmed vignette. */
  --p-shadow: 0 1px 2px rgba(0,0,0,.06), 0 8px 24px -8px rgba(0,0,0,.22), 0 24px 48px -16px rgba(0,0,0,.28);
  --p-shadow-sm: 0 1px 2px rgba(0,0,0,.1), 0 6px 16px -8px rgba(0,0,0,.28);
  /* SF / system stack to match the repo (San Francisco on Apple devices). */
  --p-font: system-ui, -apple-system, "SF Pro Text", "SF Pro Display", "Segoe UI", sans-serif;

  /* Stacking order, all within the single max z-index host. */
  --p-z-vignette: 1;
  --p-z-bubble: 20;
  --p-z-stage: 30;

  font-family: var(--p-font);
  font-variation-settings: 'wdth' 100;
  color: var(--p-fg);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
.phillip-root *, .phillip-root *::before, .phillip-root *::after { box-sizing: border-box; border-width: 0; border-style: solid; }

/* Tabular figures for any value that changes in place (no width jitter). */
.tnum { font-variant-numeric: tabular-nums; }

/* --- ambient glow (the conversation's backdrop) --- */
/* Per the Figma: no dark wash and no live blur — a single deep-blue glow
   blooms behind the transcript column and dissolves well before mid-page;
   the rest of the site is untouched (transcript legibility comes from the
   scroller's own top fade). The "300px blur" in the design is pre-computed
   here as a radial gradient (zero per-frame cost; never a live filter). */
.vignette {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: var(--p-z-vignette);
  background:
    radial-gradient(480px 560px at calc(100% - 190px) calc(100% - 210px),
      rgba(5,77,140,.30) 0%,
      rgba(5,77,140,.16) 42%,
      rgba(5,77,140,.06) 62%,
      transparent 72%);
  -webkit-mask-image: radial-gradient(120% 120% at 100% 100%,
    #000 0%, #000 30%, rgba(0,0,0,.5) 48%, transparent 62%);
  mask-image: radial-gradient(120% 120% at 100% 100%,
    #000 0%, #000 30%, rgba(0,0,0,.5) 48%, transparent 62%);
}

/* --- resting bubble (closed) --- */
/* The photo IS the button — no dark plate behind it. The neutral background
   only covers the flash before the avatar loads. */
.bubble {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: var(--p-z-bubble);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  padding: 0;
  cursor: pointer;
  background: #e5e5e5;
  box-shadow: 0 1px 2px rgba(0,0,0,.08), 0 12px 32px -8px rgba(0,0,0,.28);
  transition: box-shadow .3s;
  overflow: visible;
}
.bubble:hover { box-shadow: 0 2px 4px rgba(0,0,0,.08), 0 16px 40px -8px rgba(0,0,0,.34); }
/* Breathing idle loop lives on the INNER img, never the button: motion drives
   the button's inline transform (hover/tap springs) and a CSS transform
   animation there would fight it. */
.bubble img {
  width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.06);
  animation: p-breathe 4.5s ease-in-out 2s infinite;
}
@keyframes p-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.025); }
}
.bubble-badge {
  position: absolute;
  top: -1px; right: -1px;
  width: 12px; height: 12px;
  background: var(--p-pop);
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,.25);
}
/* Always-on "online" presence — a live person, not a dormant chat icon. */
.bubble-status {
  position: absolute;
  right: 1px; bottom: 1px;
  width: 11px; height: 11px;
  border-radius: 50%;
  background: #30d158;
  border: 2px solid #fff;
  box-shadow: 0 1px 2px rgba(0,0,0,.25);
}

/* --- shared avatar photo --- */
.avatar {
  border-radius: 50%;
  object-fit: cover;
  display: block;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.08);
}
.avatar.sm { width: 40px; height: 40px; }
.avatar.xs { width: 30px; height: 30px; }

/* --- resting peek (the speech bubble off Phillip's face) --- */
.nudge {
  position: fixed;
  right: 92px;
  bottom: 22px;
  z-index: var(--p-z-bubble);
  display: flex;
  align-items: flex-start;
  gap: 6px;
  max-width: min(300px, calc(100vw - 116px));
  transform-origin: bottom right;
  will-change: transform, opacity, filter;
  pointer-events: none;
}
.nudge-card {
  pointer-events: auto;
  display: flex; align-items: center; gap: 10px;
  text-align: left;
  border: none; cursor: pointer; font-family: inherit;
  padding: 10px 12px 10px 10px;
  border-radius: 16px;
  background: var(--p-glass);
  backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  -webkit-backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  /* Same layered shadow family as the launcher, plus the glass ring. */
  box-shadow: 0 1px 2px rgba(0,0,0,.08), 0 12px 32px -8px rgba(0,0,0,.28), var(--p-glass-ring);
}
.nudge-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.nudge-head { display: flex; align-items: center; gap: 7px; }
.nudge-name { font-weight: 600; font-size: 12.5px; color: var(--p-fg); }
.nudge-live { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: #0ea54b; font-weight: 600; }
.nudge-live-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #30d158; box-shadow: 0 0 0 3px rgba(48,209,88,.18);
}
.nudge-msg { font-size: 13px; line-height: 1.35; color: var(--p-fg); text-wrap: pretty; }
.nudge-dismiss {
  pointer-events: auto; flex: none;
  width: 22px; height: 22px; margin-top: 3px;
  border: none; cursor: pointer;
  border-radius: 50%;
  color: var(--p-muted);
  background: var(--p-glass);
  backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  -webkit-backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  box-shadow: var(--p-shadow-sm), var(--p-glass-ring);
  display: grid; place-items: center;
}

/* --- frameless stage (open) --- */
.stage {
  position: fixed;
  right: 32px;
  bottom: 28px;
  z-index: var(--p-z-stage);
  width: min(420px, calc(100vw - 40px));
  max-height: min(78vh, 680px);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  transform-origin: bottom right;
  will-change: transform, opacity, filter;
  /* Empty regions stay click-through; interactive children opt back in. */
  pointer-events: none;
}
.stage-close {
  pointer-events: auto;
  align-self: flex-end;
  border: none;
  cursor: pointer;
  width: 30px; height: 30px;
  border-radius: 50%;
  margin-bottom: 8px;
  color: var(--p-fg);
  background: var(--p-glass);
  backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  -webkit-backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  box-shadow: var(--p-shadow-sm), var(--p-glass-ring);
  display: grid; place-items: center;
  transition: box-shadow .18s ease, color .18s ease;
}
.stage-close:hover { box-shadow: var(--p-shadow), var(--p-glass-ring); }
.stage-scroll {
  pointer-events: auto;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  scroll-behavior: smooth;
  /* The scroll clip would shear off bubble shadows (and the hanging tail) at
     the column edges — bleed the clip box 12px past the stage on both sides
     and pad the same amount back, so shadows breathe while bubbles stay
     aligned with the composer. */
  margin: 0 -12px;
  padding: 16px 12px 12px;
  /* At rest only a whisper of a fade (hides the clip line); once content
     scrolls behind the top edge (.scrolled, toggled in Stage) the dissolve
     deepens. Pixel-based so it never scales with the column and swallows the
     first message. */
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 8px);
  mask-image: linear-gradient(to bottom, transparent 0, #000 8px);
}
.stage-scroll.scrolled {
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 88px);
  mask-image: linear-gradient(to bottom, transparent 0, #000 88px);
}
.stage-footer { pointer-events: auto; margin-top: 2px; display: flex; flex-direction: column; gap: 8px; }

/* --- transcript --- */
/* Figma rhythm: 4.5px between grouped bubbles; the run gap comes from the tail
   row's reserved space (.has-tail), mirroring iMessage's grouping. */
.convo { display: flex; flex-direction: column; gap: 4px; }

/* --- messages (frameless iMessage bubbles, metrics from Figma 1:28) --- */
.msg { display: flex; max-width: 100%; }
.msg.lead { justify-content: flex-end; }
.msg.system { justify-content: center; }
/* Tail hangs ~6.5px below the bubble; reserve that space + the run gap. */
.msg.has-tail { margin-bottom: 7px; }
.msg-bubble-wrap { position: relative; max-width: min(315px, 84%); display: flex; }
.msg-bubble {
  position: relative;
  padding: 10px 13.5px;
  border-radius: var(--p-bubble-radius);
  font-size: 18px;
  line-height: 1.29;
  letter-spacing: -.008em;
  white-space: pre-wrap;
  word-wrap: break-word;
  text-wrap: pretty;
  box-shadow: 0 1px 2px rgba(0,0,0,.12), 0 6px 16px -8px rgba(0,0,0,.3);
}
.msg.phillip .msg-bubble { background: var(--p-them-bg); color: var(--p-them-fg); }
/* The sent bubble is the brand gradient (iMessage blue, ours). Fallback mode
   (no JS sampling): the gradient lands on solid brand-b at calc(100% - 10.5px)
   — exactly where the tail's top edge starts (17px tall, hanging 6.5px below)
   — so the solid-brand-b tail meets solid color and the seam vanishes. */
.msg.lead .msg-bubble {
  background-color: var(--p-brand-b);
  background-image: linear-gradient(180deg, var(--p-brand-a), var(--p-brand-b) calc(100% - 10.5px));
  color: #fff;
  box-shadow: 0 1px 2px rgba(0,60,120,.28), 0 8px 20px -10px rgba(0,110,220,.45);
}

/* A bubble that goes somewhere ("done — tap to see it"): whole-bubble tap. */
.msg-bubble.linked {
  cursor: pointer;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  transition: filter .14s ease, transform .14s ease;
}
.msg-bubble.linked:hover { filter: brightness(1.03); }
.msg-bubble.linked:active { transform: scale(.98); }

/* Mask-shaped tail (last bubble of a run only). Rendered INSIDE the bubble:
   hangs below (bottom:-6.5px) and insets 6.5px from the edge, exactly like
   the simulator. The span paints a plain background clipped by the BubbleTail
   SVG path (same path data as ui/icons.tsx) — a background, not a glyph, so
   field mode below can position one shared gradient across bubble AND tail
   with no seam; them is mirrored. */
.msg-tail {
  position: absolute;
  bottom: -6.5px;
  width: 16px;
  height: 17px;
  pointer-events: none;
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 17 18' preserveAspectRatio='none'%3E%3Cpath d='M1.8 11C2.79 11 3.44 11.31 4.77 12.24C5.48 12.74 8.22 14.84 10.49 16.09C12.45 17.17 14.13 17.91 14.55 17.94C15.81 18.04 15.97 16.85 15.48 16.21C14.99 15.57 14.43 14.74 14.21 14.29C13.73 13.28 13.58 12.75 13.58 11.24C13.58 9.38 14.9 8 15.94 7.08C16.03 7 16.15 6.9 16.29 6.79C16.53 6.6 16.76 6.41 16.99 6.22V0H0V11H1.8Z'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 17 18' preserveAspectRatio='none'%3E%3Cpath d='M1.8 11C2.79 11 3.44 11.31 4.77 12.24C5.48 12.74 8.22 14.84 10.49 16.09C12.45 17.17 14.13 17.91 14.55 17.94C15.81 18.04 15.97 16.85 15.48 16.21C14.99 15.57 14.43 14.74 14.21 14.29C13.73 13.28 13.58 12.75 13.58 11.24C13.58 9.38 14.9 8 15.94 7.08C16.03 7 16.15 6.9 16.29 6.79C16.53 6.6 16.76 6.41 16.99 6.22V0H0V11H1.8Z'/%3E%3C/svg%3E");
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}
.msg.phillip .msg-tail { left: 6.5px; transform: scaleX(-1); background: var(--p-them-bg); }
.msg.lead .msg-tail { right: 6.5px; background: var(--p-brand-b); }

/* Field mode (the iMessage effect) — useBubbleGradientField measures the
   scroller and every sent bubble/tail, then stretches ONE brand gradient
   across the whole transcript viewport: --p-grad-h is the viewport height,
   --p-grad-y each element's (clamped) offset within it. Bubble and tail
   sample the same image, so the pair is seamless and the blue deepens as
   bubbles sit lower on screen. Without .grad-on (jsdom, hidden, pre-measure)
   the static per-bubble fallback above stays in effect. */
.convo.grad-on .msg.lead .msg-bubble,
.convo.grad-on .msg.lead .msg-tail {
  background-color: var(--p-brand-b);
  background-image: var(--p-brand-grad);
  background-repeat: no-repeat;
  background-size: 100% var(--p-grad-h, 100%);
  background-position: 0 var(--p-grad-y, 0px);
}

.msg.system .msg-bubble {
  background: transparent; color: var(--p-muted); font-size: 12px;
  text-align: center; box-shadow: none;
}
.msg-bubble.error { background: #fee2e2; color: #b91c1c; }
.msg-bubble.error .msg-tail { background: #fee2e2; }

/* --- typing --- */
.typing {
  display: inline-flex; gap: 4px; padding: 11px 14px;
  background: var(--p-them-bg); border-radius: var(--p-bubble-radius);
  box-shadow: 0 1px 2px rgba(0,0,0,.12), 0 6px 16px -8px rgba(0,0,0,.3);
}
.typing span {
  width: 7px; height: 7px; border-radius: 50%; background: var(--p-muted); display: block;
  animation: p-typing 1.2s ease-in-out infinite;
}
.typing span:nth-child(2) { animation-delay: .15s; }
.typing span:nth-child(3) { animation-delay: .3s; }
@keyframes p-typing {
  0%, 60%, 100% { opacity: .35; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-2px); }
}

/* --- quick replies (floating glass chips) --- */
.quick-replies { display: flex; flex-wrap: wrap; gap: 7px; justify-content: flex-end; }
.qr {
  border: none; color: var(--p-fg);
  background: var(--p-glass);
  backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  -webkit-backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  border-radius: 999px; padding: 8px 14px; font-size: 13px; cursor: pointer;
  font-family: inherit; box-shadow: var(--p-shadow-sm), var(--p-glass-ring);
  transition: box-shadow .12s ease;
}
.qr:hover { box-shadow: var(--p-shadow), var(--p-glass-ring); }
.qr:disabled { opacity: .5; cursor: default; }

/* --- composer (single frameless glass pill) --- */
.composer {
  display: flex; gap: 6px; align-items: center;
  padding: 6px 6px 6px 16px;
  background: var(--p-glass);
  backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  -webkit-backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  border-radius: 999px;
  box-shadow: var(--p-shadow-sm), var(--p-glass-ring);
  transition: box-shadow .18s ease;
}
.composer:focus-within {
  box-shadow: var(--p-shadow-sm), var(--p-glass-ring), 0 0 0 3px rgba(0,136,255,.14);
}
.composer input {
  flex: 1; border: none; background: transparent; outline: none;
  padding: 6px 0; font-size: 15px; font-family: inherit; color: var(--p-fg);
}
.composer input::placeholder { color: var(--p-muted); }
.composer button {
  border: none; border-radius: 50%; width: 36px; height: 36px; flex: none;
  background: var(--p-brand-grad); color: #ffffff; cursor: pointer;
  display: grid; place-items: center;
  box-shadow: 0 1px 3px rgba(0,90,180,.35);
  transition: opacity .14s ease, transform .14s ease, filter .14s ease;
}
.composer button:disabled { opacity: .35; cursor: default; filter: blur(.2px); transform: scale(.92); }
.composer button:not(:disabled):hover { filter: brightness(1.07); }
.composer button:not(:disabled):active { transform: scale(.93); }

/* --- sub-flow glass card (iteration / checkout / escalation / setup) --- */
.stage-card {
  background: var(--p-glass);
  backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  -webkit-backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  border-radius: 20px;
  box-shadow: var(--p-shadow), var(--p-glass-ring);
}
.iteration { padding: 13px 15px; display: flex; flex-direction: column; gap: 10px; }
.iter-label { font-size: 12px; color: var(--p-muted); font-weight: 600; }
.iter-options { display: flex; flex-wrap: wrap; gap: 7px; }
.iter-chip {
  border: 1px solid rgba(0,0,0,.08); background: rgba(255,255,255,.6); border-radius: 999px;
  padding: 7px 13px; font-size: 13px; cursor: pointer; font-family: inherit;
  transition: background .12s ease, border-color .12s ease;
}
.iter-chip:hover { background: #fff; }
.iter-chip.selected { background: var(--p-brand-grad); color: #ffffff; border-color: transparent; }
.iter-text {
  border: 1px solid rgba(0,0,0,.1); border-radius: 14px; padding: 10px 13px;
  font-size: 14px; font-family: inherit; resize: none; min-height: 60px; outline: none;
  color: var(--p-fg); background: rgba(255,255,255,.7);
  transition: border-color .14s ease, box-shadow .14s ease;
}
.iter-text:focus { border-color: #c7c7cd; box-shadow: 0 0 0 4px rgba(0,0,0,.04); }
.iter-actions { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.iter-submit {
  border: none; border-radius: 999px; padding: 9px 17px; font-size: 13px; font-weight: 600;
  background: var(--p-brand-grad); color: #ffffff; cursor: pointer; font-family: inherit;
  box-shadow: 0 1px 3px rgba(0,90,180,.35);
}
.iter-submit:disabled { opacity: .4; cursor: default; }

/* --- working / notices --- */
.working { display: flex; align-items: center; gap: 9px; color: var(--p-muted); font-size: 13px; padding: 4px 2px; }
.spinner {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid var(--p-line); border-top-color: var(--p-muted);
  animation: phillip-spin .8s linear infinite;
}
@keyframes phillip-spin { to { transform: rotate(360deg); } }

.notice {
  background: rgba(255,255,255,.6); border-radius: 14px; padding: 10px 13px;
  font-size: 13px; color: var(--p-fg); text-wrap: pretty;
}
.notice a { color: var(--p-pop); }

/* --- sub-flow extras --- */
.composer.bare {
  background: rgba(255,255,255,.7);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.1);
  padding: 5px 5px 5px 15px;
}
.checkout-includes {
  margin: 0; padding-left: 18px; color: var(--p-fg); font-size: 13px;
  display: flex; flex-direction: column; gap: 4px;
}
.iter-note { font-size: 11px; color: var(--p-muted); }
.setup-steps { display: flex; flex-direction: column; gap: 9px; }
.setup-step { display: flex; align-items: center; gap: 9px; font-size: 13px; cursor: pointer; }
.setup-step input { accent-color: var(--p-accent); width: 16px; height: 16px; }

/* The spinner and the launcher's idle breathe are the only genuine CSS loops;
   motion handles the rest and honors reduced-motion via MotionConfig at the
   root. */
@media (prefers-reduced-motion: reduce) {
  .spinner { animation: none; }
  .bubble img { animation: none; }
  .typing span { animation: none; opacity: .6; }
  .stage { will-change: auto; }
}
`;
