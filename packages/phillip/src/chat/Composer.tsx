import { m, useReducedMotion } from "motion/react";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { containerVariants, itemVariants, press, tapTransition } from "../overlay/motion";
import { SendArrow } from "../ui/icons";

export function Composer({
  disabled,
  onSend,
}: {
  disabled?: boolean;
  onSend: (text: string) => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const [text, setText] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
  };

  return (
    <m.form
      className="composer"
      onSubmit={submit}
      variants={containerVariants(reduce)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <m.input
        variants={itemVariants(reduce)}
        value={text}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
        placeholder="type a message…"
        aria-label="message"
        autoComplete="off"
      />
      <m.button
        type="submit"
        variants={itemVariants(reduce)}
        disabled={disabled || text.trim().length === 0}
        aria-label="send"
        whileTap={press}
        transition={tapTransition}
      >
        <SendArrow size={18} />
      </m.button>
    </m.form>
  );
}
