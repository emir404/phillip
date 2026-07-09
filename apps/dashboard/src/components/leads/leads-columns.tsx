"use client";

import { DataTableColumnHeader } from "@/components/data-table";
import { StageBadge } from "@/components/stage-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { money, relativeTime } from "@/lib/analytics";
import type { DashboardLead } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { LeadStage } from "@nutz/phillip";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import type * as React from "react";

// The stage tabs above the table filter on membership in these groups; the
// groups mirror how the team talks about the funnel: still warming up,
// actively being built for, or already buying.
export const STAGE_GROUPS = [
  { value: "active", label: "Active", stages: ["delivered", "opened", "engaged", "reacted"] },
  { value: "building", label: "Building", stages: ["iterating", "escalated"] },
  { value: "won", label: "Won", stages: ["checkout", "paid", "live"] },
] as const satisfies ReadonlyArray<{ value: string; label: string; stages: LeadStage[] }>;

export type StageGroupValue = "all" | (typeof STAGE_GROUPS)[number]["value"];

function initialsOf(business: string) {
  const parts = business.split(/\s+/).filter(Boolean);
  const chars = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : business.slice(0, 2);
  return chars.toUpperCase();
}

function scoreTone(score: number) {
  if (score >= 70) return "bg-emerald-500 dark:bg-emerald-400";
  if (score >= 40) return "bg-amber-500 dark:bg-amber-400";
  return "bg-slate-400 dark:bg-slate-500";
}

// Column-level classNames (responsive hiding) are carried through meta and
// applied to both the header and body cells by LeadsView.
export type ColumnMetaWithClass = { className?: string };

export const leadsColumns: ColumnDef<DashboardLead, unknown>[] = [
  {
    id: "business",
    // Fold the searchable identity fields into one accessor so the global
    // filter covers business, contact, email, and industry at once.
    accessorFn: (row) =>
      [row.lead.business, row.lead.contact, row.lead.email, row.lead.industry]
        .filter(Boolean)
        .join(" "),
    header: ({ column }) => <DataTableColumnHeader column={column} title="Business" />,
    cell: ({ row }) => {
      const { lead } = row.original;
      return (
        <span className="flex items-center gap-2.5">
          <Avatar className="size-8 rounded-lg max-sm:hidden">
            <AvatarFallback className="rounded-lg bg-brand/10 text-xs font-semibold text-brand dark:bg-brand/18 dark:text-brand-start">
              {initialsOf(lead.business)}
            </AvatarFallback>
          </Avatar>
          <span className="grid leading-tight">
            <Link
              href={`/leads/${lead.id}`}
              className="max-w-48 truncate font-medium hover:underline"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {lead.business}
            </Link>
            <span className="max-w-48 truncate text-xs text-muted-foreground">
              {lead.contact ?? lead.industry ?? "—"}
            </span>
          </span>
        </span>
      );
    },
    enableHiding: false,
    meta: { label: "Business" },
  },
  {
    id: "stage",
    accessorFn: (row) => row.lead.stage,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Stage" />,
    cell: ({ row }) => <StageBadge stage={row.original.lead.stage} />,
    filterFn: (row, id, value) => {
      if (!Array.isArray(value) || value.length === 0) return true;
      return value.includes(String(row.getValue(id)));
    },
    enableSorting: false,
    meta: { label: "Stage" },
  },
  {
    id: "score",
    accessorFn: (row) => row.engagementScore,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Score" />,
    cell: ({ row }) => {
      const score = row.original.engagementScore;
      return (
        <span className="flex items-center gap-2">
          <span
            className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-muted sm:block"
            aria-hidden
          >
            <span
              className={cn("block h-full rounded-full", scoreTone(score))}
              style={{ width: `${score}%` }}
            />
          </span>
          <span className="text-sm tabular-nums">{score}</span>
        </span>
      );
    },
    meta: { label: "Score" },
  },
  {
    id: "messages",
    accessorFn: (row) => row.conversation?.messages.length ?? 0,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Messages" />,
    cell: ({ row }) => {
      const count = row.original.conversation?.messages.length ?? 0;
      return count === 0 ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className="tabular-nums">{count}</span>
      );
    },
    meta: { label: "Messages", className: "max-md:hidden" },
  },
  {
    id: "revenue",
    accessorFn: (row) => (row.order?.status === "paid" ? row.order.amount : 0),
    header: ({ column }) => <DataTableColumnHeader column={column} title="Revenue" />,
    cell: ({ row }) => {
      const order = row.original.order;
      return order?.status === "paid" ? (
        <span className="font-mono text-[13px] tabular-nums">
          {money(order.amount, order.currency)}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
    meta: { label: "Revenue", className: "max-sm:hidden" },
  },
  {
    id: "lastSeen",
    accessorFn: (row) => row.session.lastSeen,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Last seen" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums" suppressHydrationWarning>
        {relativeTime(row.original.session.lastSeen)}
      </span>
    ),
    meta: { label: "Last seen" },
  },
  {
    id: "source",
    accessorFn: (row) => row.lead.source,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Source" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.lead.source}</span>,
    enableSorting: false,
    meta: { label: "Source", className: "max-lg:hidden" },
  },
];
