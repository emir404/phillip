import { type FormEvent, useState } from "react";

export function Composer({
  disabled,
  onSend,
}: {
  disabled?: boolean;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
  };

  return (
    <form className="composer" onSubmit={submit}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="type a message…"
        aria-label="message"
        autoComplete="off"
      />
      <button type="submit" disabled={disabled || text.trim().length === 0} aria-label="send">
        ↑
      </button>
    </form>
  );
}
