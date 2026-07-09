"use client";

import { StageBadge } from "@/components/stage-badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import Link from "next/link";
import { useRouter } from "next/navigation";

function scoreTone(score: number) {
  if (score >= 70) return "bg-emerald-500 dark:bg-emerald-400";
  if (score >= 40) return "bg-amber-500 dark:bg-amber-400";
  return "bg-slate-400 dark:bg-slate-500";
}

export function LeadsTable({ leads }: { leads: DashboardLead[] }) {
  const router = useRouter();

  return (
    <Card className="shadow-none" aria-label="Leads">
      <CardHeader>
        <CardTitle>Leads</CardTitle>
        <CardDescription>{leads.length} in the pipeline</CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Business</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Score</TableHead>
            <TableHead className="hidden md:table-cell">Last seen</TableHead>
            <TableHead className="hidden pr-4 lg:table-cell">Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((l) => (
            <TableRow
              key={l.lead.id}
              className="cursor-pointer"
              onClick={() => router.push(`/leads/${l.lead.id}`)}
            >
              <TableCell className="pl-4">
                <Link
                  href={`/leads/${l.lead.id}`}
                  className="block max-w-52 truncate font-medium hover:underline"
                >
                  {l.lead.business}
                </Link>
                <span className="block max-w-52 truncate text-xs text-muted-foreground">
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
              <TableCell className="hidden text-muted-foreground tabular-nums md:table-cell">
                <span suppressHydrationWarning>{relativeTime(l.session.lastSeen)}</span>
              </TableCell>
              <TableCell className="hidden pr-4 text-muted-foreground lg:table-cell">
                {l.lead.source}
              </TableCell>
            </TableRow>
          ))}
          {leads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                No leads yet — create one to get started.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </Card>
  );
}
