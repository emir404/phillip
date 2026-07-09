"use client";

import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type RowSelectionState,
  type SortingState,
  type Table as TableType,
  type VisibilityState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  CaretDoubleLeft,
  CaretDoubleRight,
  CaretLeft,
  CaretRight,
  CaretUpDown,
} from "@phosphor-icons/react";

// Generic TanStack Table plumbing adapted from the shadcnblocks data-table
// donor: a state-owning hook plus the header, pagination, and toolbar pieces,
// kept data-agnostic so any surface can compose them.

type UseDataTableOptions<TData> = {
  data: Array<TData>;
  columns: Array<ColumnDef<TData, unknown>>;
  getRowId?: (row: TData) => string;
  initialSorting?: SortingState;
  initialGlobalFilter?: string;
  initialFilters?: ColumnFiltersState;
  initialVisibility?: VisibilityState;
  initialSelection?: RowSelectionState;
  enableRowSelection?: boolean;
};

export function useDataTable<TData>(options: UseDataTableOptions<TData>) {
  const {
    data,
    columns,
    getRowId,
    initialSorting = [],
    initialFilters = [],
    initialGlobalFilter = "",
    initialVisibility = {},
    initialSelection = {},
    enableRowSelection = false,
  } = options;

  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(initialFilters);
  const [globalFilter, setGlobalFilter] = React.useState<string>(initialGlobalFilter);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialVisibility);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(initialSelection);

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { sorting, columnFilters, globalFilter, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    enableRowSelection,
  });

  return {
    table,
    columnFilters,
    setColumnFilters,
    sorting,
    setSorting,
    globalFilter,
    setGlobalFilter,
    columnVisibility,
    setColumnVisibility,
    rowSelection,
    setRowSelection,
  };
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
}: {
  column: Column<TData, TValue>;
  title: string;
}) {
  const canSort = column.getCanSort();
  const sorted = column.getIsSorted();

  if (!canSort) {
    return (
      <span className="flex h-8 items-center text-sm font-medium text-foreground">{title}</span>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-1 flex h-8 items-center gap-1.5 px-1 text-sm font-medium text-foreground"
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      <span>{title}</span>
      {sorted === "desc" ? (
        <ArrowDown />
      ) : sorted === "asc" ? (
        <ArrowUp />
      ) : (
        <span className="opacity-50" aria-hidden>
          <CaretUpDown />
        </span>
      )}
    </Button>
  );
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 30],
}: {
  table: TableType<TData>;
  pageSizeOptions?: number[];
}) {
  const currentPage = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalRows = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();

  // A footer full of disabled controls is noise while the book is small.
  if (totalRows <= pageSizeOptions[0] && pageCount <= 1) return null;

  const startRow = currentPage * pageSize + 1;
  const endRow = Math.min((currentPage + 1) * pageSize, totalRows);
  const relevantPageSizes = pageSizeOptions.filter(
    (size) => size <= totalRows || size === pageSize,
  );

  return (
    <div className="flex flex-col gap-4 px-1 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1 text-center text-sm text-muted-foreground tabular-nums sm:text-left">
        {totalRows === 0 ? "No results" : `Showing ${startRow}–${endRow} of ${totalRows}`}
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
        <div className="flex items-center gap-2">
          <p className="text-sm whitespace-nowrap text-muted-foreground">Rows per page</p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
            disabled={totalRows === 0}
          >
            <SelectTrigger size="sm" className="w-[68px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {relevantPageSizes.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">
            Page {currentPage + 1} of {Math.max(pageCount, 1)}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              className="hidden lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={currentPage === 0 || totalRows === 0}
              aria-label="Go to first page"
            >
              <CaretDoubleLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Go to previous page"
            >
              <CaretLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Go to next page"
            >
              <CaretRight />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              className="hidden lg:flex"
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={currentPage === pageCount - 1 || totalRows === 0}
              aria-label="Go to last page"
            >
              <CaretDoubleRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DataTableToolbar({
  children,
  search,
  className,
  ...props
}: React.ComponentProps<"div"> & { search?: React.ReactNode }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2", className)} {...props}>
      <div className="flex flex-1 items-center gap-2">{children}</div>
      <div className="flex w-full items-center gap-2 sm:w-auto">{search}</div>
    </div>
  );
}
