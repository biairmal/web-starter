"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import {
  type MobileCard,
  MobileCards,
} from "@/components/data-table/mobile-cards";
import { Pagination } from "@/components/data-table/pagination";
import { nextSort, parseSort } from "@/components/data-table/use-list-params";
import { ErrorState } from "@/components/feedback/error-state";
import { SkeletonBar } from "@/components/feedback/page-skeleton";
import type { Page } from "@/lib/api/types";
import { cn } from "@/lib/utils";

// Server-paged admin lists (DESIGN_BRIEF 6.2, TRD 8.4): a table from 640px, a
// two-line card list below. Paging, sorting and filters live in the URL
// (useListParams); this component only renders the current page and its
// loading, error and empty states (APP_FLOW 6).

export type DataTableColumn<T> = {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** The API's sort field; makes the header a sort toggle. */
  sortField?: string;
  /** Numbers are right-aligned (end-aligned) with their header. */
  align?: "start" | "end";
  /** The identity column gets a third of the width and never truncates. */
  identity?: boolean;
};

/** The parts of a TanStack Query result the table needs. */
export type PageQuery<T> = {
  data: Page<T> | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  isRefetching?: boolean;
  refetch: () => unknown;
};

const SKELETON_ROWS = 5;

export function DataTable<T>({
  columns,
  query,
  getRowId,
  mobileCard,
  caption,
  errorTitle,
  empty,
  sort,
  onSortChange,
  onPageChange,
  onSizeChange,
}: {
  columns: readonly DataTableColumn<T>[];
  query: PageQuery<T>;
  getRowId: (row: T) => string;
  mobileCard: (row: T) => MobileCard;
  /** The table's accessible name, e.g. "Users". */
  caption: string;
  /** What failed, e.g. "Couldn't load users." */
  errorTitle: React.ReactNode;
  /** Shown when the page has no rows: the first-run or the no-match state. */
  empty: React.ReactNode;
  sort?: string | undefined;
  onSortChange?: (sort: string | undefined) => void;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
}) {
  const t = useTranslations("dataTable");
  const rows = useMemo(() => query.data?.items ?? [], [query.data]);
  const definitions = useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((column) => ({
        id: column.id,
        header: () => column.header,
        cell: ({ row }) => column.cell(row.original),
      })),
    [columns],
  );
  const table = useReactTable({
    data: rows,
    columns: definitions,
    getRowId: (row) => getRowId(row),
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  });
  const byId = new Map(columns.map((column) => [column.id, column]));
  const activeSort = parseSort(sort);

  if (query.isError) {
    return (
      <ErrorState
        title={errorTitle}
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
        retrying={query.isRefetching ?? false}
      />
    );
  }

  const loading = query.isPending;
  const hasRows = rows.length > 0;

  return (
    <div className="flex flex-col">
      <div
        className={cn("hidden sm:block", !loading && !hasRows && "sm:hidden")}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-body">
            <caption className="sr-only">{caption}</caption>
            <thead className="sticky top-0 bg-background">
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => {
                    const column = byId.get(header.column.id);
                    const sorted =
                      column?.sortField !== undefined &&
                      activeSort?.field === column.sortField
                        ? activeSort.direction
                        : undefined;
                    const label = flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    );
                    return (
                      <th
                        key={header.id}
                        scope="col"
                        aria-sort={
                          column?.sortField === undefined
                            ? undefined
                            : sorted === "ASC"
                              ? "ascending"
                              : sorted === "DESC"
                                ? "descending"
                                : "none"
                        }
                        className={cn(
                          "h-9 px-3 text-small font-normal text-muted-foreground first:ps-0 last:pe-0",
                          column?.align === "end" ? "text-end" : "text-start",
                          column?.identity && "w-1/3",
                        )}
                      >
                        {column?.sortField !== undefined && onSortChange ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            onClick={() => {
                              onSortChange(
                                nextSort(sort, column.sortField ?? ""),
                              );
                            }}
                          >
                            {label}
                            {sorted === "ASC" && (
                              <ArrowUp aria-hidden="true" className="size-3" />
                            )}
                            {sorted === "DESC" && (
                              <ArrowDown
                                aria-hidden="true"
                                className="size-3"
                              />
                            )}
                          </button>
                        ) : (
                          label
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody aria-busy={loading || undefined}>
              {loading
                ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
                    <tr key={index} className="h-12 border-t border-rule">
                      {columns.map((column) => (
                        <td
                          key={column.id}
                          className="px-3 first:ps-0 last:pe-0"
                        >
                          <SkeletonBar
                            className={cn(
                              column.identity ? "w-2/3" : "w-1/2",
                              column.align === "end" && "ms-auto",
                            )}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                : table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="h-12 border-t border-rule hover:bg-raised"
                    >
                      {row.getVisibleCells().map((cell) => {
                        const column = byId.get(cell.column.id);
                        return (
                          <td
                            key={cell.id}
                            className={cn(
                              "px-3 first:ps-0 last:pe-0",
                              column?.align === "end" &&
                                "text-end tabular-nums",
                            )}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {loading ? (
        <div role="status" className="flex flex-col sm:hidden">
          <span className="sr-only">{t("loading")}</span>
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <div
              key={index}
              className="flex h-16 flex-col justify-center gap-2 border-b border-rule"
            >
              <SkeletonBar className="w-1/2" />
              <SkeletonBar className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        hasRows && (
          <MobileCards
            rows={rows}
            getRowId={getRowId}
            card={mobileCard}
            label={caption}
            className="sm:hidden"
          />
        )
      )}

      {!loading && !hasRows && empty}

      {query.data && hasRows && (
        <Pagination
          page={query.data}
          onPageChange={onPageChange}
          onSizeChange={onSizeChange}
        />
      )}
    </div>
  );
}
