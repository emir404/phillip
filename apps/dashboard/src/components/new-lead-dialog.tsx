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
import { Textarea } from "@/components/ui/textarea";
import { createLeadAction } from "@/lib/actions";
import { Plus } from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

// Mirrors embedSnippet() in src/lib/previews.ts, composed client-side so the
// host can come from window.location.origin.
const snippetFor = (previewId: string) =>
  `<script src="${window.location.origin}/phillip.js" data-preview-id="${previewId}" defer></script>`;

export function NewLeadDialog() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [snippet, setSnippet] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const res = await createLeadAction({
      business: String(fd.get("business") ?? ""),
      contact: String(fd.get("contact") ?? ""),
      email: String(fd.get("email") ?? ""),
      industry: String(fd.get("industry") ?? ""),
      source: String(fd.get("source") ?? ""),
      siteUrl: String(fd.get("siteUrl") ?? ""),
      siteHtml: String(fd.get("siteHtml") ?? ""),
    });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setSnippet(snippetFor(res.previewId));
    toast.success("Lead created — drop the snippet into the preview site.");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSnippet(null);
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <Plus data-icon="inline-start" />
        New lead
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {snippet ? (
          <>
            <DialogHeader>
              <DialogTitle>Embed snippet</DialogTitle>
              <DialogDescription>
                Paste this into the preview site's&nbsp;
                <code className="rounded bg-muted px-1 py-0.5 text-xs">&lt;head&gt;</code> to start
                tracking the lead.
              </DialogDescription>
            </DialogHeader>
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
              Iterations run automatically only when site source is attached — otherwise they queue
              for you.
            </p>
          </>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="nl-industry">Industry</Label>
                  <Input id="nl-industry" name="industry" placeholder="barbershop" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="nl-source">Source</Label>
                  <Input id="nl-source" name="source" placeholder="manual" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="nl-siteUrl">Site URL</Label>
                <Input id="nl-siteUrl" name="siteUrl" placeholder="https://preview.example.com" />
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
                Iterations run automatically only when site source is attached — otherwise they
                queue for you.
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
