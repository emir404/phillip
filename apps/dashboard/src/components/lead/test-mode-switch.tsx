"use client";

import { Switch } from "@/components/ui/switch";
import { setTestModeAction } from "@/lib/actions";
import { useState } from "react";
import { toast } from "sonner";

// The per-lead sibling of Stripe's own test/live toggle: while on, this lead's
// checkout runs on Stripe's test keys — the whole purchase flow can be
// rehearsed with the 4242 card, no real money, same webhook, same go-silent.
export function TestModeSwitch({ leadId, testMode }: { leadId: string; testMode: boolean }) {
  const [pending, setPending] = useState(false);
  const [on, setOn] = useState(testMode);

  return (
    <span className="inline-flex">
      <Switch
        checked={on}
        disabled={pending}
        aria-label="Toggle test mode"
        onCheckedChange={async (next) => {
          setPending(true);
          const res = await setTestModeAction(leadId, next);
          setPending(false);
          if (res.ok) {
            setOn(next);
            toast.success(
              next
                ? "Test mode on — checkout uses Stripe test keys (4242 card works)."
                : "Test mode off — checkout charges real money again.",
            );
          } else {
            toast.error(res.error);
          }
        }}
      />
    </span>
  );
}
