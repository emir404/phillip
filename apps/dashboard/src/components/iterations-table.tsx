"use client";

import { IterationStatusBadge, statusReasonLabel } from "@/components/iteration-status-badge";
import { MarkIterationDoneButton } from "@/components/lead/row-actions";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { IterationRowStatus } from "@/db/schema";
import { relativeTime } from "@/lib/analytics";
import type { ChangeSet } from "@nutz/phillip";
import { ArrowSquareOut } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

export interface IterationListRow {
  iteration: {
    id: string;
    leadId: string;
    round: number;
    changeSet: ChangeSet;
    status: IterationRowStatus;
    statusReason: string | null;
    resultUrl: string | null;
    createdAt: string;
  };
  business: string | null;
}

type Filter = "all" | "running" | "attention" | "done";

const FILTERS: Array<{ value: Filter; label: string; match: (s: IterationRowStatus) => boolean }> =
  [
    { value: "all", label: "All", match: () => true },
    { value: "running", label: "Running", match: (s) => s === "queued" || s === "processing" },
    {
      value: "attention",
      label: "Needs attention",
      match: (s) => s === "queued_manual" || s === "failed",
    },
    { value: "done", label: "Done", match: (s) => s === "done" },
  ];

function changeSummary(cs: ChangeSet): { kinds: string; freeText?: string } {
  const kinds = [...new Set(cs.items.map((i) => i.kind))].join(", ");
  const freeText = cs.freeText?.trim();
  return {
    kinds: kinds || (freeText ? "free-form" : "—"),
    freeText:
      freeText && freeText.length > 72 ? `${freeText.slice(0, 72)}…` : freeText || undefined,
  };
}

export function IterationsTable({ rows }: { rows: IterationListRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const match = FILTERS.find((f) => f.value === filter)?.match ?? (() => true);
  const visible = rows.filter((r) => match(r.iteration.status));
  const counts = Object.fromEntries(
    FILTERS.map((f) => [f.value, rows.filter((r) => f.match(r.iteration.status)).length]),
  ) as Record<Filter, number>;

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value} className="px-2.5">
              {f.label}
              <span className="text-xs text-muted-foreground tabular-nums">{counts[f.value]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Business</TableHead>
              <TableHead>Round</TableHead>
              <TableHead className="hidden md:table-cell">Change set</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Result</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
              <TableHead className="pr-4 text-right" aria-label="Actions" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map(({ iteration: it, business }) => {
              const summary = changeSummary(it.changeSet);
              const reason = statusReasonLabel(it.statusReason);
              return (
                <TableRow key={it.id}>
                  <TableCell className="pl-4">
                    <Link
                      href={`/leads/${it.leadId}`}
                      className="max-w-44 truncate font-medium hover:underline"
                    >
                      {business ?? it.leadId}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums">{it.round}</TableCell>
                  <TableCell className="hidden max-w-72 md:table-cell">
                    <span className="block truncate text-sm">{summary.kinds}</span>
                    {summary.freeText ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        “{summary.freeText}”
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-col items-start gap-0.5">
                      <IterationStatusBadge status={it.status} />
                      {reason ? (
                        <span className="max-w-44 truncate text-xs text-muted-foreground">
                          {reason}
                        </span>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {it.resultUrl ? (
                      <a
                        href={it.resultUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm underline underline-offset-2"
                      >
                        <ArrowSquareOut size={13} />
                        View
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground tabular-nums md:table-cell">
                    <span suppressHydrationWarning>{relativeTime(it.createdAt)}</span>
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    {it.status === "queued_manual" ? (
                      <MarkIterationDoneButton iterationId={it.id} />
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No iterations in this view.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
