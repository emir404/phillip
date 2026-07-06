import { m, useReducedMotion } from "motion/react";
import { useState } from "react";
import { containerVariants, itemVariants } from "../overlay/motion";
import { SETUP_STEPS } from "./setup";

export function SetupPanel({ onComplete }: { onComplete: () => void }) {
  const reduce = useReducedMotion() ?? false;
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
    <m.div
      className="iteration"
      variants={containerVariants(reduce)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <m.div className="iter-label" variants={itemVariants(reduce)}>
        let's get you live
      </m.div>
      <m.div className="setup-steps" variants={containerVariants(reduce)}>
        {SETUP_STEPS.map((s) => (
          <m.label key={s.id} className="setup-step" variants={itemVariants(reduce)}>
            <input type="checkbox" checked={done.has(s.id)} onChange={() => toggle(s.id)} />
            <span>{s.label}</span>
          </m.label>
        ))}
      </m.div>
      <m.div className="iter-actions" variants={itemVariants(reduce)}>
        <button type="button" className="iter-submit" onClick={onComplete} disabled={!allDone}>
          go live 🎉
        </button>
      </m.div>
    </m.div>
  );
}
