"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setLeadLanguageAction } from "@/lib/actions";
import type { Language } from "@nutz/phillip";
import { LANGUAGES, LANGUAGE_LABELS } from "@nutz/phillip/i18n";
import { useState } from "react";
import { toast } from "sonner";

// Blank means "inherit the global persona's language" — a named sentinel rather
// than "", which a Select is entitled to read as "nothing selected".
const INHERIT = "inherit";

export function LeadLanguageForm({
  leadId,
  language,
  globalLanguage,
  /** True once the lead has said something — switching now can't rewrite the
   *  greeting they already read, so say so. */
  hasSpoken,
}: {
  leadId: string;
  language: Language | null;
  globalLanguage: Language;
  hasSpoken: boolean;
}) {
  const [value, setValue] = useState<string>(language ?? INHERIT);
  const [pending, setPending] = useState(false);

  const items = [
    { value: INHERIT, label: `Default — ${LANGUAGE_LABELS[globalLanguage]}` },
    ...LANGUAGES.map((v) => ({ value: v, label: LANGUAGE_LABELS[v] })),
  ];

  async function onChange(next: string) {
    const previous = value;
    setValue(next);
    setPending(true);
    const res = await setLeadLanguageAction({
      leadId,
      language: next === INHERIT ? "" : next,
    });
    setPending(false);
    if (!res.ok) {
      setValue(previous);
      toast.error(res.error);
      return;
    }
    const spoken = next === INHERIT ? globalLanguage : (next as Language);
    toast.success(
      hasSpoken
        ? `Phillip replies in ${LANGUAGE_LABELS[spoken]} from his next message.`
        : `Phillip greets this lead in ${LANGUAGE_LABELS[spoken]}.`,
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Select
        items={items}
        value={value}
        disabled={pending}
        onValueChange={(v) => onChange(String(v))}
      >
        <SelectTrigger id="lead-language" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((l) => (
            <SelectItem key={l.value} value={l.value}>
              {l.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {hasSpoken
          ? "The conversation has already started — the opening line stays as they read it, and Phillip switches from his next reply."
          : "Nobody has replied yet, so the opening line is rewritten in the new language."}
      </p>
    </div>
  );
}
