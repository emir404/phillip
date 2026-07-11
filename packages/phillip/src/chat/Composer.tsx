import { m, useReducedMotion } from "motion/react";
import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { type Language, widgetCopy } from "../i18n";
import { containerVariants, itemVariants, press, tapTransition } from "../overlay/motion";
import { Paperclip, SendArrow } from "../ui/icons";

export function Composer({
  disabled,
  onSend,
  onAttach,
  language,
}: {
  disabled?: boolean;
  onSend: (text: string) => void;
  /** Files picked here become a change request — the widget opens the
   *  takeover with them pinned. Absent (iteration off) hides the paperclip. */
  onAttach?: (files: FileList) => void;
  language?: Language;
}) {
  const reduce = useReducedMotion() ?? false;
  const [text, setText] = useState("");
  const copy = widgetCopy(language);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      {onAttach ? (
        <m.button
          type="button"
          className="attach"
          variants={itemVariants(reduce)}
          disabled={disabled}
          aria-label={copy.attachFile}
          title={copy.attachFile}
          onClick={() => fileInputRef.current?.click()}
          whileTap={press}
          transition={tapTransition}
        >
          <Paperclip size={16} />
        </m.button>
      ) : null}
      <m.input
        variants={itemVariants(reduce)}
        value={text}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
        placeholder={copy.composerPlaceholder}
        aria-label={copy.composerLabel}
        autoComplete="off"
      />
      <m.button
        type="submit"
        variants={itemVariants(reduce)}
        disabled={disabled || text.trim().length === 0}
        aria-label={copy.send}
        whileTap={press}
        transition={tapTransition}
      >
        <SendArrow size={18} />
      </m.button>
      {/* Last in the DOM on purpose: hidden, and code (tests included) that
          reaches for the composer's first <input> means the text field. */}
      {onAttach ? (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          multiple
          hidden
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            if (e.target.files?.length) onAttach(e.target.files);
            e.target.value = ""; // same file re-pickable next time
          }}
        />
      ) : null}
    </m.form>
  );
}
