import type { Offer } from "../types/boot";
import { formatPrice } from "./payment";

export function CheckoutPanel({
  offer,
  busy,
  onPay,
  onCancel,
}: {
  offer: Offer;
  busy: boolean;
  onPay: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="iteration">
      <div className="iter-label">here's what's included</div>
      <ul className="checkout-includes">
        {offer.includes.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <div className="iter-actions">
        <button type="button" className="qr" onClick={onCancel} disabled={busy}>
          not yet
        </button>
        <button type="button" className="iter-submit" onClick={onPay} disabled={busy}>
          {busy ? (
            "opening…"
          ) : (
            <>
              make it live · <span className="tnum">{formatPrice(offer)}</span>
            </>
          )}
        </button>
      </div>
      <div className="iter-note">
        stripe checkout is stubbed in v0 — this simulates a successful payment.
      </div>
    </div>
  );
}
