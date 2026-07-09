"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type DomainVerification, connectDomainAction } from "@/lib/actions";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

export function ConnectDomainForm({ leadId }: { leadId: string }) {
  const [pending, setPending] = useState(false);
  const [records, setRecords] = useState<DomainVerification[] | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const domain = String(fd.get("domain") ?? "");
    setPending(true);
    const res = await connectDomainAction(leadId, domain);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setRecords(res.verification);
    toast.success(
      res.verification.length
        ? "Domain added — DNS verification needed."
        : "Domain added and verified.",
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          name="domain"
          required
          placeholder="forgebarbers.com"
          aria-label="Custom domain"
          autoComplete="off"
        />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Connecting…" : "Connect"}
        </Button>
      </form>
      {records && records.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 pl-3 text-xs">Type</TableHead>
                <TableHead className="h-8 text-xs">Domain</TableHead>
                <TableHead className="h-8 pr-3 text-xs">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={`${r.type}-${r.domain}-${r.value}`}>
                  <TableCell className="pl-3 font-mono text-xs">{r.type}</TableCell>
                  <TableCell className="font-mono text-xs">{r.domain}</TableCell>
                  <TableCell className="max-w-40 truncate pr-3 font-mono text-xs" title={r.value}>
                    {r.value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">
            Add this DNS record at the registrar, then Vercel verifies the domain automatically.
          </p>
        </div>
      ) : null}
    </div>
  );
}
