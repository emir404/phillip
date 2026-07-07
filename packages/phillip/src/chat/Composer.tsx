import { m, useReducedMotion } from "motion/react";
import { type FormEvent, useRef, useState } from "react";
import { readAttachment } from "../lib/attachments";
import { log } from "../lib/log";
import { containerVariants, itemVariants, press, tapTransition } from "../overlay/motion";
import type { Attachment } from "../types/records";
import { Dismiss, FileIcon, Paperclip, PhotoIcon, SendArrow } from "../ui/icons";

// Lovable-style attach cap — enough to cover "logo + a couple of extra
// photos" without turning the composer into a file manager.
const MAX_ATTACHMENTS = 5;

export function Composer({
  disabled,
  onSend,
}: {
  disabled?: boolean;
  onSend: (text: string, attachments?: Attachment[]) => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if ((!t && pending.length === 0) || disabled) return;
    onSend(t, pending.length ? pending : undefined);
    setText("");
    setPending([]);
  };

  const onFilesChosen = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const room = MAX_ATTACHMENTS - pending.length;
    if (room <= 0) {
      setError(`up to ${MAX_ATTACHMENTS} files at a time`);
      return;
    }
    const chosen = Array.from(files).slice(0, room);
    try {
      const read = await Promise.all(chosen.map(readAttachment));
      setPending((p) => [...p, ...read]);
      if (files.length > chosen.length) setError(`up to ${MAX_ATTACHMENTS} files at a time`);
    } catch (err) {
      log.warn("attachment read failed", err);
      setError(err instanceof Error ? err.message : "couldn't read that file");
    }
  };

  const removePending = (name: string) => {
    setPending((p) => p.filter((a) => a.name !== name));
  };

  return (
    <m.div variants={containerVariants(reduce)} initial="initial" animate="animate" exit="exit">
      {pending.length > 0 ? (
        <div className="attach-preview">
          {pending.map((a) => (
            <div className="attach-chip" key={a.name}>
              {a.mediaType.startsWith("image/") ? <PhotoIcon size={18} /> : <FileIcon size={18} />}
              <span className="attach-tooltip">{a.name}</span>
              <button
                type="button"
                className="attach-remove"
                aria-label={`remove ${a.name}`}
                onClick={() => removePending(a.name)}
              >
                <Dismiss size={11} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {error ? <div className="attach-error">{error}</div> : null}
      <m.form className="composer" onSubmit={submit}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          multiple
          hidden
          onChange={(e) => {
            void onFilesChosen(e.target.files);
            e.target.value = "";
          }}
        />
        <m.button
          type="button"
          className="composer-attach"
          variants={itemVariants(reduce)}
          disabled={disabled}
          aria-label="attach a photo or file"
          onClick={() => fileInputRef.current?.click()}
          whileTap={press}
          transition={tapTransition}
        >
          <Paperclip size={16} />
        </m.button>
        <m.input
          variants={itemVariants(reduce)}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="type a message…"
          aria-label="message"
          autoComplete="off"
        />
        <m.button
          type="submit"
          className="composer-send"
          variants={itemVariants(reduce)}
          disabled={disabled || (text.trim().length === 0 && pending.length === 0)}
          aria-label="send"
          whileTap={press}
          transition={tapTransition}
        >
          <SendArrow size={18} />
        </m.button>
      </m.form>
    </m.div>
  );
}
