// All widget CSS, exported as a string so it can be adopted into the shadow
// root identically across tsup, Vite, and Vitest (no CSS-loader coordination).
// Host page styles cannot reach in (shadow boundary) and ours cannot leak out;
// the `:host { all: initial }` reset also blocks inherited font/color bleed.
//
// Animation note: enter/exit motion lives in the components via the `motion`
// library (see src/overlay/motion.ts) so it stays interruptible. CSS keeps only
// genuinely ambient loops (the indeterminate spinner) plus static styling.
//
// Radius note: radii are concentric — a nested element's radius is the parent's
// minus the gap between them (outer − padding), so corners stay visually
// parallel. The panel is 22px; its 14px-inset header controls land near 8px.

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

  /* iMessage-shaped bubbles, monochrome brand (not iMessage blue). */
  --p-them-bg: #e9e9eb;
  --p-them-fg: #1c1c1e;
  --p-bubble-radius: 19px;
  --p-bubble-tail: 7px;

  /* Frosted surfaces. */
  --p-glass: rgba(255,255,255,.72);
  --p-glass-blur: 20px;

  --p-radius: 22px;
  /* Layered, soft elevation reads more premium than one hard drop shadow. */
  --p-shadow: 0 1px 2px rgba(0,0,0,.04), 0 8px 24px -8px rgba(0,0,0,.18), 0 24px 48px -16px rgba(0,0,0,.22);
  --p-shadow-sm: 0 1px 2px rgba(0,0,0,.06), 0 4px 12px -4px rgba(0,0,0,.16);
  --p-font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;

  /* Stacking order, all within the single max z-index host. */
  --p-z-vignette: 1;
  --p-z-bubble: 20;
  --p-z-panel: 30;
  --p-z-notif: 40;

  font-family: var(--p-font);
  color: var(--p-fg);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
.phillip-root *, .phillip-root *::before, .phillip-root *::after { box-sizing: border-box; }

/* Tabular figures for any value that changes in place (no width jitter). */
.tnum { font-variant-numeric: tabular-nums; }

/* --- vignette --- */
.vignette {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: var(--p-z-vignette);
  background: radial-gradient(120% 120% at 100% 100%,
    rgba(15,15,20,.28) 0%, rgba(15,15,20,.12) 26%, rgba(15,15,20,0) 58%);
}

/* --- notifications --- */
.notif-stack {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: var(--p-z-notif);
  display: flex;
  flex-direction: column-reverse;
  gap: 10px;
  pointer-events: none;
  width: 340px;
  max-width: calc(100vw - 32px);
}
.notif-card {
  pointer-events: auto;
  display: flex;
  align-items: stretch;
  gap: 8px;
  padding: 12px 12px 12px 13px;
  background: var(--p-glass);
  backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  -webkit-backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  border-radius: 18px;
  box-shadow: var(--p-shadow), inset 0 0 0 1px rgba(255,255,255,.5);
  will-change: transform, opacity, filter;
}
.notif-body {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 11px;
  border: none;
  background: transparent;
  padding: 0;
  margin: 0;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  color: var(--p-fg);
  min-width: 0;
}
.notif-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.notif-name { font-weight: 650; font-size: 13.5px; letter-spacing: -.01em; }
.notif-preview {
  font-size: 13px;
  color: var(--p-muted);
  text-wrap: pretty;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.notif-dismiss {
  flex: none;
  align-self: flex-start;
  border: none;
  background: rgba(0,0,0,.05);
  color: var(--p-muted);
  width: 22px; height: 22px;
  border-radius: 50%;
  display: grid; place-items: center;
  cursor: pointer;
}
.notif-dismiss:hover { background: rgba(0,0,0,.1); color: var(--p-fg); }

/* --- bubble --- */
.bubble {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: var(--p-z-bubble);
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  padding: 0;
  cursor: pointer;
  background: var(--p-accent);
  box-shadow: var(--p-shadow);
  overflow: visible;
}
.bubble img {
  width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.08);
}
.bubble-badge {
  position: absolute;
  top: 0; right: 0;
  width: 14px; height: 14px;
  background: var(--p-pop);
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,.25);
}

/* --- panel --- */
.panel {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: var(--p-z-panel);
  width: 376px;
  max-width: calc(100vw - 32px);
  height: 564px;
  max-height: calc(100vh - 40px);
  background: var(--p-bg);
  border-radius: var(--p-radius);
  box-shadow: var(--p-shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform-origin: bottom right;
  will-change: transform, opacity, filter;
}

.panel-header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 14px 14px 13px;
  background: var(--p-glass);
  backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  -webkit-backdrop-filter: blur(var(--p-glass-blur)) saturate(1.6);
  /* Shadow, not a hard 1px border — softer separation (article). */
  box-shadow: 0 1px 0 rgba(0,0,0,.04), 0 10px 18px -14px rgba(0,0,0,.25);
}
.panel-id { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; }
.panel-name { font-weight: 700; font-size: 15px; letter-spacing: -.01em; text-wrap: balance; }
.panel-title { font-size: 12px; color: var(--p-muted); text-wrap: balance; }
.panel-status { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--p-muted); margin-left: auto; }
.panel-status .dot { width: 7px; height: 7px; border-radius: 50%; background: #34d399; box-shadow: 0 0 0 3px rgba(52,211,153,.18); }
.panel-close {
  border: none; background: transparent; cursor: pointer;
  width: 30px; height: 30px; border-radius: 9px; color: var(--p-muted);
  display: grid; place-items: center; flex: none;
}
.panel-close:hover { background: rgba(0,0,0,.05); color: var(--p-fg); }

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  background: var(--p-bg);
  scroll-behavior: smooth;
}
.convo { display: flex; flex-direction: column; gap: 10px; }
.panel-placeholder { color: var(--p-muted); font-size: 13px; margin: auto; text-align: center; }

/* --- avatar --- */
.avatar {
  border-radius: 50%; object-fit: cover; flex: none; display: block;
  /* Inset outline gives photos depth against the surface (article). */
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.08);
}
.avatar.sm { width: 38px; height: 38px; }
.avatar.xs { width: 26px; height: 26px; }

/* --- messages (iMessage shape) --- */
.msg { display: flex; gap: 8px; align-items: flex-end; max-width: 100%; }
.msg.lead { flex-direction: row-reverse; }
.msg-bubble-wrap { position: relative; max-width: 78%; display: flex; }
.msg-bubble {
  position: relative;
  padding: 8px 13px;
  border-radius: var(--p-bubble-radius);
  font-size: 14px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-wrap: break-word;
  text-wrap: pretty;
}
/* them (Phillip) — gray, tail at bottom-left. The ::after carves the curve
   using the surface color; both pseudos sit to the left of the bubble box so
   they never cover text. */
.msg.phillip .msg-bubble { background: var(--p-them-bg); color: var(--p-them-fg); }
.msg.phillip .msg-bubble::before {
  content: ""; position: absolute; bottom: 0; left: calc(var(--p-bubble-tail) * -1);
  width: 14px; height: 19px; background: var(--p-them-bg);
  border-bottom-right-radius: 15px;
}
.msg.phillip .msg-bubble::after {
  content: ""; position: absolute; bottom: 0; left: calc(var(--p-bubble-tail) * -1 - 7px);
  width: 12px; height: 19px; background: var(--p-bg);
  border-bottom-right-radius: 12px;
}
/* you (lead) — accent fill, tail at bottom-right. */
.msg.lead .msg-bubble { background: var(--p-accent); color: var(--p-accent-fg); }
.msg.lead .msg-bubble::before {
  content: ""; position: absolute; bottom: 0; right: calc(var(--p-bubble-tail) * -1);
  width: 14px; height: 19px; background: var(--p-accent);
  border-bottom-left-radius: 15px;
}
.msg.lead .msg-bubble::after {
  content: ""; position: absolute; bottom: 0; right: calc(var(--p-bubble-tail) * -1 - 7px);
  width: 12px; height: 19px; background: var(--p-bg);
  border-bottom-left-radius: 12px;
}
.msg.system { justify-content: center; }
.msg.system .msg-bubble { background: transparent; color: var(--p-muted); font-size: 12px; text-align: center; }
.msg.system .msg-bubble::before, .msg.system .msg-bubble::after { display: none; }
.msg-bubble.error { background: #fee2e2; color: #b91c1c; }
.msg-bubble.error::before { background: #fee2e2; }

/* Reaction badge — visual slot, ready to populate later. */
.msg-reaction {
  position: absolute;
  top: -12px;
  font-size: 13px;
  line-height: 1;
  padding: 3px 5px;
  background: var(--p-bg);
  border-radius: 999px;
  box-shadow: var(--p-shadow-sm);
}
.msg.phillip .msg-reaction { right: -6px; }
.msg.lead .msg-reaction { left: -6px; }

/* --- typing --- */
.typing {
  display: inline-flex; gap: 4px; padding: 12px 14px;
  background: var(--p-them-bg); border-radius: var(--p-bubble-radius);
}
.typing span { width: 7px; height: 7px; border-radius: 50%; background: var(--p-muted); display: block; }

/* --- quick replies --- */
.quick-replies { display: flex; flex-wrap: wrap; gap: 7px; padding: 0 14px 10px; }
.qr {
  border: 1px solid var(--p-line); background: #fff; color: var(--p-fg);
  border-radius: 999px; padding: 8px 14px; font-size: 13px; cursor: pointer;
  font-family: inherit; transition: background .12s ease, border-color .12s ease, box-shadow .12s ease;
}
.qr:hover { background: var(--p-soft); border-color: #d4d4d8; box-shadow: var(--p-shadow-sm); }
.qr:disabled { opacity: .5; cursor: default; }

/* --- composer --- */
.composer {
  display: flex; gap: 8px; align-items: center;
  padding: 11px 12px; border-top: 1px solid var(--p-line);
  background: var(--p-bg);
}
.composer input {
  flex: 1; border: 1px solid var(--p-line); border-radius: 999px;
  padding: 10px 15px; font-size: 14px; font-family: inherit; outline: none; color: var(--p-fg);
  background: #fff; transition: border-color .14s ease, box-shadow .14s ease;
}
.composer input:focus { border-color: #c7c7cd; box-shadow: 0 0 0 4px rgba(0,0,0,.04); }
.composer button {
  border: none; border-radius: 50%; width: 38px; height: 38px; flex: none;
  background: var(--p-accent); color: var(--p-accent-fg); cursor: pointer;
  display: grid; place-items: center;
  transition: opacity .14s ease, transform .14s ease, filter .14s ease;
}
.composer button:disabled { opacity: .35; cursor: default; filter: blur(.2px); transform: scale(.94); }

/* --- iteration panel --- */
.iteration { border-top: 1px solid var(--p-line); padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
.iter-label { font-size: 12px; color: var(--p-muted); font-weight: 600; }
.iter-options { display: flex; flex-wrap: wrap; gap: 7px; }
.iter-chip {
  border: 1px solid var(--p-line); background: #fff; border-radius: 999px;
  padding: 7px 13px; font-size: 13px; cursor: pointer; font-family: inherit;
  transition: background .12s ease, border-color .12s ease;
}
.iter-chip:hover { background: var(--p-soft); }
.iter-chip.selected { background: var(--p-accent); color: var(--p-accent-fg); border-color: var(--p-accent); }
.iter-text {
  border: 1px solid var(--p-line); border-radius: 14px; padding: 10px 13px;
  font-size: 14px; font-family: inherit; resize: none; min-height: 60px; outline: none; color: var(--p-fg);
  transition: border-color .14s ease, box-shadow .14s ease;
}
.iter-text:focus { border-color: #c7c7cd; box-shadow: 0 0 0 4px rgba(0,0,0,.04); }
.iter-actions { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.iter-submit {
  border: none; border-radius: 999px; padding: 9px 17px; font-size: 13px; font-weight: 600;
  background: var(--p-accent); color: var(--p-accent-fg); cursor: pointer; font-family: inherit;
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
  background: var(--p-soft); border-radius: 14px; padding: 10px 13px;
  font-size: 13px; color: var(--p-fg); text-wrap: pretty;
}
.notice a { color: var(--p-pop); }

/* --- stub panels (escalation / checkout / setup) --- */
.composer.bare { border-top: none; padding: 0; }
.checkout-includes {
  margin: 0; padding-left: 18px; color: var(--p-fg); font-size: 13px;
  display: flex; flex-direction: column; gap: 4px;
}
.iter-note { font-size: 11px; color: var(--p-muted); }
.setup-steps { display: flex; flex-direction: column; gap: 9px; }
.setup-step { display: flex; align-items: center; gap: 9px; font-size: 13px; cursor: pointer; }
.setup-step input { accent-color: var(--p-accent); width: 16px; height: 16px; }

/* The spinner is the one genuine CSS loop; motion handles the rest and honors
   reduced-motion via MotionConfig at the root. */
@media (prefers-reduced-motion: reduce) {
  .spinner { animation: none; }
  .panel, .notif-card { will-change: auto; }
}
`;
