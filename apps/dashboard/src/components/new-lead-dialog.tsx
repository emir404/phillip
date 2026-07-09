"use client";

import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createLeadAction, getLeadDefaultsAction } from "@/lib/actions";
import { money } from "@/lib/analytics";
import type { PricingSettings } from "@/lib/store";
import type { Language } from "@nutz/phillip";
import { LANGUAGES, LANGUAGE_LABELS } from "@nutz/phillip/i18n";
import { Plus } from "@phosphor-icons/react";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

// The picker's "use the global persona's language" option, the same way a blank
// price field means "charge the global price". A named sentinel rather than "",
// which a Select is entitled to read as "nothing selected".
const INHERIT = "inherit";

const languageItems = (globalLanguage: Language | null) => [
  {
    value: INHERIT,
    label: globalLanguage ? `Default — ${LANGUAGE_LABELS[globalLanguage]}` : "Default",
  },
  ...LANGUAGES.map((value) => ({ value, label: LANGUAGE_LABELS[value] })),
];

// Mirrors embedSnippet()/nextSnippet() in src/lib/previews.ts, composed
// client-side so the host can come from window.location.origin.
const snippetFor = (previewId: string) =>
  `<script src="${window.location.origin}/phillip.js" data-preview-id="${previewId}" defer></script>`;

const nextSnippetFor = (previewId: string) =>
  [
    'import Script from "next/script";',
    "",
    "// app/layout.tsx — inside <body>, after {children}",
    "<Script",
    `  src="${window.location.origin}/phillip.js"`,
    `  data-preview-id="${previewId}"`,
    '  strategy="afterInteractive"',
    "/>",
  ].join("\n");

interface Created {
  previewId: string;
  /** A repo-backed lead is a framework app — show it the Next snippet first. */
  hasRepo: boolean;
}

const major = (cents: number) => (cents / 100).toFixed(2);

export function NewLeadDialog() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const [tab, setTab] = useState<"html" | "next">("html");
  // The globals a blank field falls back to, shown as its placeholder/label.
  const [pricing, setPricing] = useState<PricingSettings | null>(null);
  const [globalLanguage, setGlobalLanguage] = useState<Language | null>(null);
  const [language, setLanguage] = useState<string>(INHERIT);

  useEffect(() => {
    if (!open || pricing) return;
    getLeadDefaultsAction().then(
      (d) => {
        setPricing(d.pricing);
        setGlobalLanguage(d.language);
      },
      () => {},
    );
  }, [open, pricing]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const repoUrl = String(fd.get("repoUrl") ?? "");
    setPending(true);
    const res = await createLeadAction({
      business: String(fd.get("business") ?? ""),
      contact: String(fd.get("contact") ?? ""),
      email: String(fd.get("email") ?? ""),
      industry: String(fd.get("industry") ?? ""),
      source: String(fd.get("source") ?? ""),
      siteUrl: String(fd.get("siteUrl") ?? ""),
      siteHtml: String(fd.get("siteHtml") ?? ""),
      repoUrl,
      setupAmount: String(fd.get("setupAmount") ?? ""),
      monthlyAmount: String(fd.get("monthlyAmount") ?? ""),
      language: language === INHERIT ? "" : language,
    });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const hasRepo = Boolean(repoUrl.trim());
    setTab(hasRepo ? "next" : "html");
    setCreated({ previewId: res.previewId, hasRepo });
    toast.success("Lead created — drop the snippet into the preview site.");
  }

  const langItems = languageItems(globalLanguage);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setCreated(null);
          setLanguage(INHERIT);
        }
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <Plus data-icon="inline-start" />
        New lead
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {created ? (
          (() => {
            const snippet =
              tab === "next" ? nextSnippetFor(created.previewId) : snippetFor(created.previewId);
            return (
              <>
                <DialogHeader>
                  <DialogTitle>Embed snippet</DialogTitle>
                  <DialogDescription>
                    {tab === "next"
                      ? "Add this to the app's root layout to start tracking the lead."
                      : "Paste this into the preview site's <head> to start tracking the lead."}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
                  {(["html", "next"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        tab === t
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t === "html" ? "HTML" : "Next.js"}
                    </button>
                  ))}
                </div>
                <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
                  {snippet}
                </pre>
                <div className="flex items-center gap-2">
                  <CopyButton text={snippet} label="Copy snippet" toastMessage="Snippet copied" />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                    Done
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {created.hasRepo
                    ? "Iterations edit the repo, commit, and let its Vercel build ship the change."
                    : "Iterations run automatically only when site source is attached — otherwise they queue for you."}
                </p>
              </>
            );
          })()
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>New lead</DialogTitle>
              <DialogDescription>
                Register a business and mint its preview tracking snippet.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="nl-business">Business *</Label>
                <Input id="nl-business" name="business" required placeholder="Forge Barbers" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="nl-contact">Contact</Label>
                  <Input id="nl-contact" name="contact" placeholder="Dana Forge" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="nl-email">Email</Label>
                  <Input id="nl-email" name="email" type="email" placeholder="dana@example.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="nl-industry">Industry</Label>
                  <Input id="nl-industry" name="industry" placeholder="barbershop" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="nl-source">Source</Label>
                  <Input id="nl-source" name="source" placeholder="manual" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="nl-language">Language</Label>
                  <Select
                    items={langItems}
                    value={language}
                    onValueChange={(v) => setLanguage(String(v))}
                  >
                    <SelectTrigger id="nl-language" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {langItems.map((l) => (
                        <SelectItem key={l.value} value={l.value}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Phillip greets this lead and replies in this language.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="nl-setup">Website price</Label>
                  <Input
                    id="nl-setup"
                    name="setupAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    placeholder={pricing ? major(pricing.setupAmountCents) : ""}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="nl-monthly">Hosting / month</Label>
                  <Input
                    id="nl-monthly"
                    name="monthlyAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    placeholder={pricing ? major(pricing.monthlyAmountCents) : ""}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {pricing
                  ? `Leave blank to charge the global price — ${money(pricing.setupAmountCents, pricing.currency)} one-time, then ${money(pricing.monthlyAmountCents, pricing.currency)}/mo.`
                  : "Leave blank to charge the global price set in Settings."}
              </p>
              <div className="grid gap-1.5">
                <Label htmlFor="nl-siteUrl">Site URL</Label>
                <Input id="nl-siteUrl" name="siteUrl" placeholder="https://preview.example.com" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="nl-repoUrl">GitHub repo</Label>
                <Input id="nl-repoUrl" name="repoUrl" placeholder="owner/repo or URL" />
                <p className="text-xs text-muted-foreground">
                  Repo-backed leads get automated iterations: Phillip edits the source, commits, and
                  the repo's Vercel project builds it.
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="nl-siteHtml">Site HTML (optional)</Label>
                <Textarea
                  id="nl-siteHtml"
                  name="siteHtml"
                  rows={4}
                  className="max-h-40 font-mono text-xs"
                  placeholder="<!doctype html>…  — attaching source enables automated iterations"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                No repo and no HTML? Iterations queue for you instead of running automatically.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Creating…" : "Create lead"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
