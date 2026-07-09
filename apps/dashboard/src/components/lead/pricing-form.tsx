"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setLeadPricingAction } from "@/lib/actions";
import { money } from "@/lib/analytics";
import type { PricingSettings } from "@/lib/store";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

const major = (cents: number) => (cents / 100).toFixed(2);
const asField = (cents: number | null) => (cents === null ? "" : major(cents));

/** What a field currently means: blank inherits the global, a number overrides it. */
function resolve(value: string, globalCents: number) {
  const raw = value.trim();
  if (!raw) return { cents: globalCents, custom: false };
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return { cents: Math.round(n * 100), custom: true };
}

export function LeadPricingForm({
  leadId,
  setupAmountCents,
  monthlyAmountCents,
  pricing,
  lockedReason,
  hasPendingOrder,
}: {
  leadId: string;
  setupAmountCents: number | null;
  monthlyAmountCents: number | null;
  pricing: PricingSettings;
  /** Non-null once the money has landed — the price becomes read-only. */
  lockedReason: string | null;
  hasPendingOrder: boolean;
}) {
  const [setup, setSetup] = useState(asField(setupAmountCents));
  const [monthly, setMonthly] = useState(asField(monthlyAmountCents));
  const [pending, setPending] = useState(false);

  if (lockedReason) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{lockedReason}</p>
        <p className="text-sm font-semibold tabular-nums">
          {money(setupAmountCents ?? pricing.setupAmountCents, pricing.currency)} +{" "}
          {money(monthlyAmountCents ?? pricing.monthlyAmountCents, pricing.currency)}/mo
        </p>
      </div>
    );
  }

  const nextSetup = resolve(setup, pricing.setupAmountCents);
  const nextMonthly = resolve(monthly, pricing.monthlyAmountCents);
  const dirty = setup !== asField(setupAmountCents) || monthly !== asField(monthlyAmountCents);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const res = await setLeadPricingAction({ leadId, setupAmount: setup, monthlyAmount: monthly });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      nextSetup?.custom || nextMonthly?.custom
        ? "Pricing updated for this lead."
        : "Pricing reset — this lead uses the global price.",
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="lp-setup">Website price</Label>
          <Input
            id="lp-setup"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={setup}
            onChange={(e) => setSetup(e.target.value)}
            placeholder={major(pricing.setupAmountCents)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="lp-monthly">Hosting / month</Label>
          <Input
            id="lp-monthly"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            placeholder={major(pricing.monthlyAmountCents)}
          />
        </div>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {nextSetup && nextMonthly ? (
            <>
              Charges {money(nextSetup.cents, pricing.currency)} one-time +{" "}
              {money(nextMonthly.cents, pricing.currency)}/mo.{" "}
              {nextSetup.custom || nextMonthly.custom
                ? "Clear a field to fall back to the global price."
                : "Both fields blank — using the global price."}
            </>
          ) : (
            "Prices must be non-negative numbers."
          )}
        </p>
        <Button
          type="submit"
          variant="outline"
          disabled={pending || !nextSetup || !nextMonthly || !dirty}
        >
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      {hasPendingOrder ? (
        <p className="text-xs text-muted-foreground">
          A checkout session is already open at the old price. Stripe won't re-price it — the new
          price applies the next time the visitor opens checkout.
        </p>
      ) : null}
    </form>
  );
}
