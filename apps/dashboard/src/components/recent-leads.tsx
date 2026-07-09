"use client";

import { StageBadge } from "@/components/stage-badge";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { relativeTime } from "@/lib/analytics";
import type { DashboardLead } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type * as React from "react";

function scoreTone(score: number) {
  if (score >= 70) return "bg-emerald-500 dark:bg-emerald-400";
  if (score >= 40) return "bg-amber-500 dark:bg-amber-400";
  return "bg-slate-400 dark:bg-slate-500";
}

// The overview's shortlist: whoever moved most recently, with the full book a
// click away on /leads.
export function RecentLeads({
  leads,
  className,
  limit = 5,
}: {
  leads: DashboardLead[];
  className?: string;
  limit?: number;
}) {
  const router = useRouter();
  const recent = [...leads]
    .sort((a, b) => new Date(b.session.lastSeen).getTime() - new Date(a.session.lastSeen).getTime())
    .slice(0, limit);

  return (
    <Card className={cn("h-full", className)} aria-label="Recent leads">
      <CardHeader>
        <CardTitle>Recent leads</CardTitle>
        <CardDescription>Most recently active on their preview</CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Business</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Score</TableHead>
            <TableHead className="hidden pr-4 md:table-cell">Last seen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recent.map((l) => (
            <TableRow
              key={l.lead.id}
              className="cursor-pointer"
              onClick={() => router.push(`/leads/${l.lead.id}`)}
            >
              <TableCell className="pl-4">
                <Link
                  href={`/leads/${l.lead.id}`}
                  className="block max-w-48 truncate font-medium hover:underline"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  {l.lead.business}
                </Link>
                <span className="block max-w-48 truncate text-xs text-muted-foreground">
                  {l.lead.contact ?? l.lead.industry ?? "—"}
                </span>
              </TableCell>
              <TableCell>
                <StageBadge stage={l.lead.stage} />
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-2">
                  <span
                    className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-muted sm:block"
                    aria-hidden
                  >
                    <span
                      className={cn("block h-full rounded-full", scoreTone(l.engagementScore))}
                      style={{ width: `${l.engagementScore}%` }}
                    />
                  </span>
                  <span className="text-sm tabular-nums">{l.engagementScore}</span>
                </span>
              </TableCell>
              <TableCell className="hidden pr-4 text-muted-foreground tabular-nums md:table-cell">
                <span suppressHydrationWarning>{relativeTime(l.session.lastSeen)}</span>
              </TableCell>
            </TableRow>
          ))}
          {recent.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                No leads yet — create one to get started.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      <CardFooter className="justify-end py-2.5">
        <Link
          href="/leads"
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-3.5"
        >
          All leads
          <ArrowRight aria-hidden />
        </Link>
      </CardFooter>
    </Card>
  );
}
