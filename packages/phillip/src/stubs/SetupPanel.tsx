import { useState } from "react";
import { SETUP_STEPS } from "./setup";

export function SetupPanel({ onComplete }: { onComplete: () => void }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const allDone = done.size >= SETUP_STEPS.length;

  const toggle = (id: string) =>
    setDone((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="iteration">
      <div className="iter-label">let's get you live</div>
      <div className="setup-steps">
        {SETUP_STEPS.map((s) => (
          <label key={s.id} className="setup-step">
            <input type="checkbox" checked={done.has(s.id)} onChange={() => toggle(s.id)} />
            <span>{s.label}</span>
          </label>
        ))}
      </div>
      <div className="iter-actions">
        <button type="button" className="iter-submit" onClick={onComplete} disabled={!allDone}>
          go live 🎉
        </button>
      </div>
    </div>
  );
}
