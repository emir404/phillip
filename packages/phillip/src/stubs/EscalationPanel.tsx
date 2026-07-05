import { type FormEvent, useState } from "react";
import { isValidEmail } from "./escalation";

export function EscalationPanel({
  busy,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  onSubmit: (email: string) => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState("");
  const valid = isValidEmail(email);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid && !busy) onSubmit(email.trim());
  };

  return (
    <form className="iteration" onSubmit={submit}>
      <div className="iter-label">
        drop your email and a colleague picks it up — usually within the hour
      </div>
      <div className="composer bare">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@business.com"
          aria-label="email"
          autoComplete="email"
        />
        <button type="submit" disabled={!valid || busy} aria-label="send email">
          ↑
        </button>
      </div>
      <div className="iter-actions">
        <button type="button" className="qr" onClick={onCancel} disabled={busy}>
          back
        </button>
      </div>
    </form>
  );
}
