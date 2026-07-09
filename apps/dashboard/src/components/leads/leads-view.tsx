"use client";

import { DataTablePagination, DataTableToolbar, useDataTable } from "@/components/data-table";
import {
  type ColumnMetaWithClass,
  STAGE_GROUPS,
  type StageGroupValue,
  leadsColumns,
} from "@/components/leads/leads-columns";
import { useLiveLeads } from "@/components/live-leads";
import { NewLeadDialog } from "@/components/new-lead-dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { flexRender } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import * as React from "react";

function metaClass(meta: unknown): string | undefined {
  return (meta as ColumnMetaWithClass | undefined)?.className;
}

function BrandDot() {
  return (
    <span
      className="flex size-10 items-center justify-center rounded-xl text-base font-semibold text-white [background:var(--gradient-brand)]"
      aria-hidden
    >
      p
    </span>
  );
}

export function LeadsView() {
  const { leads } = useLiveLeads();
  const router = useRouter();

  const { table, setColumnFilters } = useDataTable({
    data: leads,
    columns: leadsColumns,
    getRowId: (row) => row.lead.id,
    initialSorting: [{ id: "lastSeen", desc: true }],
  });

  const [stageTab, setStageTab] = React.useState<StageGroupValue>("all");

  // Tab counts come from the unfiltered book so they stay stable while
  // searching within a tab.
  const groupCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const group of STAGE_GROUPS) {
      counts.set(
        group.value,
        leads.filter((l) => (group.stages as readonly string[]).includes(l.lead.stage)).length,
      );
    }
    return counts;
  }, [leads]);

  const onStageTabChange = React.useCallback(
    (value: string) => {
      const next = value as StageGroupValue;
      setStageTab(next);
      setColumnFilters((prev) => {
        const rest = prev.filter((f) => f.id !== "stage");
        if (next === "all") return rest;
        const group = STAGE_GROUPS.find((g) => g.value === next);
        return group ? [...rest, { id: "stage", value: [...group.stages] }] : rest;
      });
    },
    [setColumnFilters],
  );

  const rows = table.getRowModel().rows;
  const hasAnyLeads = leads.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Leads</h1>
        <p className="text-sm text-muted-foreground">
          Everyone phillip is working — search, sort, and drill into any lead.
        </p>
      </header>

      <DataTableToolbar
        search={
          <div className="relative w-full sm:w-auto">
            <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
              <MagnifyingGlass aria-hidden />
            </span>
            <Input
              placeholder="Search leads…"
              value={(table.getState().globalFilter as string) ?? ""}
              onChange={(event) => table.setGlobalFilter(event.target.value)}
              className="h-8 w-full pl-8 lg:w-56"
              aria-label="Search leads"
            />
          </div>
        }
      >
        <Tabs
          value={stageTab}
          onValueChange={onStageTabChange}
          className="w-full min-w-64 sm:w-auto"
        >
          <TabsList
            className="flex w-full flex-wrap justify-start gap-1 group-data-horizontal/tabs:h-auto"
            aria-label="Filter leads by stage group"
          >
            <TabsTrigger value="all" className="w-fit flex-none gap-1.5">
              <span>All</span>
              <Badge variant="secondary" className="rounded-sm px-1.5 tabular-nums">
                {leads.length}
              </Badge>
            </TabsTrigger>
            {STAGE_GROUPS.map((group) => (
              <TabsTrigger
                key={group.value}
                value={group.value}
                className="w-fit flex-none gap-1.5"
              >
                <span>{group.label}</span>
                <Badge variant="secondary" className="rounded-sm px-1.5 tabular-nums">
                  {groupCounts.get(group.value) ?? 0}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </DataTableToolbar>

      {hasAnyLeads ? (
        <>
          <Card className="overflow-hidden py-0" aria-label="Leads">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent">
                    {headerGroup.headers.map((header, i) => (
                      <TableHead
                        key={header.id}
                        className={cn(
                          i === 0 && "pl-4",
                          i === headerGroup.headers.length - 1 && "pr-4",
                          metaClass(header.column.columnDef.meta),
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {rows.length ? (
                  rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/leads/${row.original.lead.id}`)}
                    >
                      {row.getVisibleCells().map((cell, i) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            i === 0 && "pl-4",
                            i === row.getVisibleCells().length - 1 && "pr-4",
                            metaClass(cell.column.columnDef.meta),
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={leadsColumns.length} className="h-28 text-center">
                      <span className="text-sm text-muted-foreground">
                        {stageTab === "all"
                          ? "No leads match that search."
                          : `Nothing in ${STAGE_GROUPS.find((g) => g.value === stageTab)?.label.toLowerCase() ?? "this tab"} right now — try All.`}
                      </span>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
          <DataTablePagination table={table} />
        </>
      ) : (
        <Card className="flex flex-col items-center gap-3 py-14 text-center">
          <BrandDot />
          <div>
            <p className="font-medium">No leads yet</p>
            <p className="text-sm text-muted-foreground">
              Register a business and phillip starts watching its preview.
            </p>
          </div>
          <NewLeadDialog />
        </Card>
      )}
    </div>
  );
}
