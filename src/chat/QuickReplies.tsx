import type { QuickReply } from "../intent/types";

// Three doors at the reaction step — and any guided options the agent proposes
// mid-conversation. Typing is always open too (the composer).
export function QuickReplies({
  replies,
  disabled,
  onPick,
}: {
  replies: QuickReply[];
  disabled?: boolean;
  onPick: (qr: QuickReply) => void;
}) {
  if (replies.length === 0) return null;
  return (
    <div className="quick-replies">
      {replies.map((qr) => (
        <button
          type="button"
          key={qr.id}
          className="qr"
          disabled={disabled}
          onClick={() => onPick(qr)}
        >
          {qr.label}
        </button>
      ))}
    </div>
  );
}
