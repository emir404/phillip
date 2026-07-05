import { m, useReducedMotion } from "motion/react";
import type { QuickReply } from "../intent/types";
import { containerVariants, itemVariants, press, tapTransition } from "../overlay/motion";

// Three doors at the reaction step — and any guided options the agent proposes
// mid-conversation. Typing is always open too (the composer). Chips cascade in
// with blur + opacity + position so they read as a considered set, not a row of
// buttons snapping into place.
export function QuickReplies({
  replies,
  disabled,
  onPick,
}: {
  replies: QuickReply[];
  disabled?: boolean;
  onPick: (qr: QuickReply) => void;
}) {
  const reduce = useReducedMotion() ?? false;
  if (replies.length === 0) return null;
  return (
    <m.div
      className="quick-replies"
      variants={containerVariants(reduce)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {replies.map((qr) => (
        <m.button
          type="button"
          key={qr.id}
          className="qr"
          disabled={disabled}
          onClick={() => onPick(qr)}
          variants={itemVariants(reduce)}
          whileHover={disabled ? undefined : { y: -1 }}
          whileTap={press}
          transition={tapTransition}
        >
          {qr.label}
        </m.button>
      ))}
    </m.div>
  );
}
