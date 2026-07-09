"use client";

import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { revealApiKeyAction, savePersonaAction, saveSettingsAction } from "@/lib/actions";
import type { PersonaSettings, PricingSettings } from "@/lib/store";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

const CURRENCIES = [
  { label: "EUR", value: "eur" },
  { label: "USD", value: "usd" },
  { label: "GBP", value: "gbp" },
];

export function BillingForm({
  pricing,
  budgetCap,
  escalationEmail,
}: {
  pricing: PricingSettings;
  budgetCap: number;
  escalationEmail: string;
}) {
  const [currency, setCurrency] = useState(pricing.currency);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const res = await saveSettingsAction({
      setupAmount: String(fd.get("setupAmount") ?? ""),
      monthlyAmount: String(fd.get("monthlyAmount") ?? ""),
      currency,
      budgetCapUsd: String(fd.get("budgetCapUsd") ?? ""),
      escalationEmail: String(fd.get("escalationEmail") ?? ""),
    });
    setPending(false);
    if (res.ok) toast.success("Settings saved.");
    else toast.error(res.error);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_6rem]">
        <div className="grid gap-1.5">
          <Label htmlFor="set-setup">Setup amount</Label>
          <Input
            id="set-setup"
            name="setupAmount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={(pricing.setupAmountCents / 100).toFixed(2)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="set-monthly">Monthly amount</Label>
          <Input
            id="set-monthly"
            name="monthlyAmount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={(pricing.monthlyAmountCents / 100).toFixed(2)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="set-currency">Currency</Label>
          <Select items={CURRENCIES} value={currency} onValueChange={(v) => setCurrency(String(v))}>
            <SelectTrigger id="set-currency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="set-budget">Budget cap (USD / lead)</Label>
          <Input
            id="set-budget"
            name="budgetCapUsd"
            type="number"
            step="0.5"
            min="0"
            required
            defaultValue={String(budgetCap)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="set-escalation">Escalation email</Label>
          <Input
            id="set-escalation"
            name="escalationEmail"
            type="email"
            required
            defaultValue={escalationEmail}
          />
        </div>
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}

export function PersonaForm({ persona }: { persona: PersonaSettings }) {
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const res = await savePersonaAction({
      name: String(fd.get("name") ?? ""),
      title: String(fd.get("title") ?? ""),
    });
    setPending(false);
    if (res.ok) toast.success("Persona saved.");
    else toast.error(res.error);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="persona-name">Name</Label>
          <Input id="persona-name" name="name" required defaultValue={persona.name} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="persona-title">Title</Label>
          <Input id="persona-title" name="title" defaultValue={persona.title} />
        </div>
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save persona"}
        </Button>
      </div>
    </form>
  );
}

export function ApiKeyReveal({ masked }: { masked: string | null }) {
  const [key, setKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!masked) {
    return (
      <p className="text-sm text-muted-foreground">
        PHILLIP_API_KEY is not configured on the server.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="rounded-lg border bg-muted/50 px-2.5 py-1.5 font-mono text-xs break-all">
        {key ?? masked}
      </code>
      {key ? (
        <>
          <CopyButton text={key} size="sm" aria-label="Copy API key" />
          <Button type="button" variant="ghost" size="sm" onClick={() => setKey(null)}>
            <EyeSlash data-icon="inline-start" />
            Hide
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            const res = await revealApiKeyAction();
            setPending(false);
            if (res.ok) setKey(res.key);
            else toast.error(res.error);
          }}
        >
          <Eye data-icon="inline-start" />
          Reveal
        </Button>
      )}
    </div>
  );
}
