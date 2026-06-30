// All widget CSS, exported as a string so it can be adopted into the shadow
// root identically across tsup, Vite, and Vitest (no CSS-loader coordination).
// Host page styles cannot reach in (shadow boundary) and ours cannot leak out;
// the `:host { all: initial }` reset also blocks inherited font/color bleed.

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
  --p-radius: 20px;
  --p-shadow: 0 12px 40px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.08);
  --p-font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-family: var(--p-font);
  color: var(--p-fg);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
.phillip-root *, .phillip-root *::before, .phillip-root *::after { box-sizing: border-box; }

/* --- bubble --- */
.bubble {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  padding: 0;
  cursor: pointer;
  background: var(--p-accent);
  box-shadow: var(--p-shadow);
  overflow: visible;
  transition: transform .15s ease;
}
.bubble:hover { transform: scale(1.05); }
.bubble img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block; }
.bubble.pulse::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  box-shadow: 0 0 0 0 rgba(255,77,141,.55);
  animation: phillip-pulse 2.2s ease-out infinite;
}
@keyframes phillip-pulse {
  0% { box-shadow: 0 0 0 0 rgba(255,77,141,.5); }
  70% { box-shadow: 0 0 0 16px rgba(255,77,141,0); }
  100% { box-shadow: 0 0 0 0 rgba(255,77,141,0); }
}
.bubble-badge {
  position: absolute;
  top: -2px; right: -2px;
  width: 14px; height: 14px;
  background: var(--p-pop);
  border: 2px solid #fff;
  border-radius: 50%;
}

/* --- panel --- */
.panel {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 372px;
  max-width: calc(100vw - 32px);
  height: 560px;
  max-height: calc(100vh - 40px);
  background: var(--p-bg);
  border-radius: var(--p-radius);
  box-shadow: var(--p-shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform-origin: bottom right;
  animation: phillip-pop .22s cubic-bezier(.2,.8,.2,1);
}
@keyframes phillip-pop {
  from { opacity: 0; transform: translateY(12px) scale(.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 14px 12px;
  border-bottom: 1px solid var(--p-line);
}
.panel-id { display: flex; flex-direction: column; line-height: 1.25; }
.panel-name { font-weight: 700; font-size: 15px; }
.panel-title { font-size: 12px; color: var(--p-muted); }
.panel-status { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--p-muted); margin-left: auto; }
.panel-status .dot { width: 7px; height: 7px; border-radius: 50%; background: #34d399; }
.panel-close {
  border: none; background: transparent; cursor: pointer;
  width: 28px; height: 28px; border-radius: 8px; color: var(--p-muted);
  font-size: 18px; line-height: 1; display: grid; place-items: center;
}
.panel-close:hover { background: var(--p-soft); color: var(--p-fg); }

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scroll-behavior: smooth;
}
.panel-placeholder { color: var(--p-muted); font-size: 13px; margin: auto; text-align: center; }

/* --- avatar --- */
.avatar { border-radius: 50%; object-fit: cover; flex: none; display: block; }
.avatar.sm { width: 36px; height: 36px; }
.avatar.xs { width: 26px; height: 26px; }

/* --- messages --- */
.msg { display: flex; gap: 8px; align-items: flex-end; max-width: 100%; }
.msg.lead { flex-direction: row-reverse; }
.msg-bubble {
  padding: 9px 12px;
  border-radius: 16px;
  font-size: 14px;
  max-width: 78%;
  white-space: pre-wrap;
  word-wrap: break-word;
}
.msg.phillip .msg-bubble { background: var(--p-soft); border-bottom-left-radius: 5px; }
.msg.lead .msg-bubble { background: var(--p-accent); color: var(--p-accent-fg); border-bottom-right-radius: 5px; }
.msg.system { justify-content: center; }
.msg.system .msg-bubble { background: transparent; color: var(--p-muted); font-size: 12px; text-align: center; }
.msg-bubble.error { background: #fee2e2; color: #b91c1c; }

/* --- typing --- */
.typing { display: inline-flex; gap: 4px; padding: 12px 12px; }
.typing span {
  width: 6px; height: 6px; border-radius: 50%; background: var(--p-muted);
  animation: phillip-blink 1.2s infinite ease-in-out both;
}
.typing span:nth-child(2) { animation-delay: .2s; }
.typing span:nth-child(3) { animation-delay: .4s; }
@keyframes phillip-blink {
  0%, 80%, 100% { opacity: .25; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-3px); }
}

/* --- quick replies --- */
.quick-replies { display: flex; flex-wrap: wrap; gap: 7px; padding: 0 14px 10px; }
.qr {
  border: 1px solid var(--p-line); background: #fff; color: var(--p-fg);
  border-radius: 999px; padding: 8px 13px; font-size: 13px; cursor: pointer;
  font-family: inherit; transition: background .12s, border-color .12s;
}
.qr:hover { background: var(--p-soft); border-color: #d4d4d8; }

/* --- composer --- */
.composer {
  display: flex; gap: 8px; align-items: center;
  padding: 10px 12px; border-top: 1px solid var(--p-line);
}
.composer input {
  flex: 1; border: 1px solid var(--p-line); border-radius: 999px;
  padding: 10px 14px; font-size: 14px; font-family: inherit; outline: none; color: var(--p-fg);
  background: #fff;
}
.composer input:focus { border-color: #c7c7cd; }
.composer button {
  border: none; border-radius: 50%; width: 38px; height: 38px; flex: none;
  background: var(--p-accent); color: var(--p-accent-fg); cursor: pointer;
  font-size: 16px; display: grid; place-items: center;
}
.composer button:disabled { opacity: .4; cursor: default; }

/* --- iteration panel --- */
.iteration { border-top: 1px solid var(--p-line); padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
.iter-label { font-size: 12px; color: var(--p-muted); font-weight: 600; }
.iter-options { display: flex; flex-wrap: wrap; gap: 7px; }
.iter-chip {
  border: 1px solid var(--p-line); background: #fff; border-radius: 999px;
  padding: 7px 12px; font-size: 13px; cursor: pointer; font-family: inherit;
}
.iter-chip.selected { background: var(--p-accent); color: var(--p-accent-fg); border-color: var(--p-accent); }
.iter-text {
  border: 1px solid var(--p-line); border-radius: 12px; padding: 10px 12px;
  font-size: 14px; font-family: inherit; resize: none; min-height: 60px; outline: none; color: var(--p-fg);
}
.iter-text:focus { border-color: #c7c7cd; }
.iter-actions { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.iter-submit {
  border: none; border-radius: 999px; padding: 9px 16px; font-size: 13px; font-weight: 600;
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
  background: var(--p-soft); border-radius: 12px; padding: 10px 12px;
  font-size: 13px; color: var(--p-fg);
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

@media (prefers-reduced-motion: reduce) {
  .bubble.pulse::after, .typing span, .spinner, .panel { animation: none; }
}
`;
