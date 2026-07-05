import { useState } from "react";
import { ITERATION_OPTIONS, type IterationOption } from "./captureChangeSet";

// Guided options + free text for an inline tweak. Lives in the panel footer
// while the iteration sub-flow is active.
export function IterationPanel({
  busy,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  onSubmit: (selected: IterationOption[], freeText: string) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const canSubmit = !busy && (selected.size > 0 || text.trim().length > 0);

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(
      ITERATION_OPTIONS.filter((o) => selected.has(o.id)),
      text,
    );
    setSelected(new Set());
    setText("");
  };

  return (
    <div className="iteration">
      <div className="iter-label">what should i change?</div>
      <div className="iter-options">
        {ITERATION_OPTIONS.map((o) => (
          <button
            type="button"
            key={o.id}
            className={selected.has(o.id) ? "iter-chip selected" : "iter-chip"}
            onClick={() => toggle(o.id)}
            disabled={busy}
          >
            {o.label}
          </button>
        ))}
      </div>
      <textarea
        className="iter-text"
        placeholder="or describe it in your words…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={busy}
      />
      <div className="iter-actions">
        <button type="button" className="qr" onClick={onCancel} disabled={busy}>
          nevermind
        </button>
        <button type="button" className="iter-submit" onClick={submit} disabled={!canSubmit}>
          {busy ? "on it…" : "redo it"}
        </button>
      </div>
    </div>
  );
}
