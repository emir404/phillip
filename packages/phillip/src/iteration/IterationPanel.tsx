import { m, useReducedMotion } from "motion/react";
import { type ChangeEvent, useState } from "react";
import { containerVariants, itemVariants, press } from "../overlay/motion";
import { ITERATION_OPTIONS, type IterationOption } from "./captureChangeSet";

// Guided options + free text for an inline tweak. Lives in the panel footer
// while the iteration sub-flow is active. Every row (label, chips, field,
// actions) cascades in with blur + opacity + position.
export function IterationPanel({
  busy,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  onSubmit: (selected: IterationOption[], freeText: string) => void;
  onCancel: () => void;
}) {
  const reduce = useReducedMotion() ?? false;
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
    <m.div
      className="iteration"
      variants={containerVariants(reduce)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <m.div className="iter-label" variants={itemVariants(reduce)}>
        what should i change?
      </m.div>
      <m.div className="iter-options" variants={containerVariants(reduce)}>
        {ITERATION_OPTIONS.map((o) => (
          <m.button
            type="button"
            key={o.id}
            className={selected.has(o.id) ? "iter-chip selected" : "iter-chip"}
            onClick={() => toggle(o.id)}
            disabled={busy}
            variants={itemVariants(reduce)}
            whileTap={press}
          >
            {o.label}
          </m.button>
        ))}
      </m.div>
      <m.textarea
        className="iter-text"
        placeholder="or describe it in your words…"
        value={text}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
        disabled={busy}
        variants={itemVariants(reduce)}
      />
      <m.div className="iter-actions" variants={itemVariants(reduce)}>
        <button type="button" className="qr" onClick={onCancel} disabled={busy}>
          nevermind
        </button>
        <button type="button" className="iter-submit" onClick={submit} disabled={!canSubmit}>
          {busy ? "on it…" : "redo it"}
        </button>
      </m.div>
    </m.div>
  );
}
