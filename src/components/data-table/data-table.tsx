"use client";

import {
  type Column,
  type ColumnDef,
  type ColumnPinningState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import {
  type MobileCard,
  MobileCards,
} from "@/components/data-table/mobile-cards";
import { Pagination } from "@/components/data-table/pagination";
import {
  BulkActionBar,
  NO_SELECTION,
  type RowSelection,
  selectionCount,
} from "@/components/data-table/selection";
import {
  nextMultiSort,
  nextSort,
  type SortValue,
  sortList,
} from "@/components/data-table/use-list-params";
import { ErrorState } from "@/components/feedback/error-state";
import { SkeletonBar } from "@/components/feedback/page-skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  /** Keeps the column in view while the table scrolls sideways. */
  pin?: "start" | "end";
  /** A pinned column's width in px (default 160); pinned columns need one. */
  width?: number;
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
const SELECT_ID = "select";
const SELECT_WIDTH = 40;
const PIN_WIDTH = 160;

/** Clicks on these, inside a row, belong to them and do not open the row. */
const CONTROLS =
  "a,button,input,select,textarea,label,[role=checkbox],[role=menuitem],[data-row-click=ignore]";

/** Whether a click or Enter should open the row rather than a control in it. */
function opensRow(event: React.SyntheticEvent<HTMLElement>) {
  const row = event.currentTarget;
  const target = event.target;
  // Events from portals (an open menu) bubble through React, not the DOM.
  if (!(target instanceof Element) || !row.contains(target)) {
    return false;
  }
  const control = target.closest(CONTROLS);
  if (control && row.contains(control)) {
    return false;
  }
  // Selecting text in a cell is not a click on the row.
  return !window.getSelection()?.toString();
}

function pinStyle<T>(
  column: Column<T>,
  width: number,
): React.CSSProperties | undefined {
  const side = column.getIsPinned();
  if (!side) {
    return undefined;
  }
  return {
    width,
    minWidth: width,
    maxWidth: width,
    ...(side === "left"
      ? { insetInlineStart: column.getStart("left") }
      : { insetInlineEnd: column.getAfter("right") }),
  };
}

function pinClasses<T>(column: Column<T>) {
  const side = column.getIsPinned();
  return cn(
    side && "sticky z-1",
    side === "left" && column.getIsLastColumn("left") && "pin-edge-start",
    side === "right" && column.getIsFirstColumn("right") && "pin-edge-end",
  );
}

export function DataTable<T>({
  columns,
  query,
  getRowId,
  getRowLabel,
  mobileCard,
  caption,
  errorTitle,
  empty,
  sort,
  onSortChange,
  multiSort = false,
  onPageChange,
  onSizeChange,
  density = "comfortable",
  contained = false,
  selectable,
  selection = NO_SELECTION,
  onSelectionChange,
  bulkActions,
  onRowClick,
  rowHref,
}: {
  columns: readonly DataTableColumn<T>[];
  query: PageQuery<T>;
  getRowId: (row: T) => string;
  /** The row's name, for its checkbox label ("Select Ayu"). Defaults to the id. */
  getRowLabel?: (row: T) => string;
  mobileCard: (row: T) => MobileCard;
  /** The table's accessible name, e.g. "Users". */
  caption: string;
  /** What failed, e.g. "Couldn't load users." */
  errorTitle: React.ReactNode;
  /** Shown when the page has no rows: the first-run or the no-match state. */
  empty: React.ReactNode;
  sort?: SortValue;
  onSortChange?: (sort: SortValue) => void;
  /** Shift-click adds a column to the sort; headers show their priority. */
  multiSort?: boolean;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
  /** Row height: comfortable (the default) or compact. */
  density?: "comfortable" | "compact";
  /** Scrolls inside a box of `--table-max-h`, under a header that stays put. */
  contained?: boolean;
  /** Adds a checkbox column. "multiple" also gets a select-page checkbox. */
  selectable?: "single" | "multiple";
  selection?: RowSelection;
  onSelectionChange?: (selection: RowSelection) => void;
  /** The bulk actions, shown in a bar while rows are selected. */
  bulkActions?: (selection: RowSelection) => React.ReactNode;
  /** Opens a row on click or Enter; clicks on links, buttons and checkboxes in it are theirs. */
  onRowClick?: (row: T) => void;
  /** Like onRowClick, but navigates; Ctrl or Cmd-click opens a new tab. */
  rowHref?: (row: T) => string;
}) {
  const t = useTranslations("dataTable");
  const router = useRouter();
  const rows = useMemo(() => query.data?.items ?? [], [query.data]);
  const byId = new Map(columns.map((column) => [column.id, column]));
  const label = (row: T) => getRowLabel?.(row) ?? getRowId(row);
  const widthOf = (id: string) =>
    id === SELECT_ID ? SELECT_WIDTH : (byId.get(id)?.width ?? PIN_WIDTH);

  const pageIds = rows.map(getRowId);
  const chosen = new Set(selection.ids);
  const isChosen = (id: string) => selection.allMatching || chosen.has(id);
  const pageChosen = pageIds.filter(isChosen).length;
  const total = query.data?.total ?? 0;
  const count = selectionCount(selection, total);

  const toggleRow = (id: string) => {
    if (!onSelectionChange) {
      return;
    }
    if (selectable === "single") {
      onSelectionChange({
        ids: chosen.has(id) ? [] : [id],
        allMatching: false,
      });
      return;
    }
    // Unticking one row of "all matching" leaves the rest of this page.
    const ids = selection.allMatching
      ? pageIds.filter((other) => other !== id)
      : chosen.has(id)
        ? selection.ids.filter((other) => other !== id)
        : [...selection.ids, id];
    onSelectionChange({ ids, allMatching: false });
  };

  const togglePage = () => {
    if (!onSelectionChange) {
      return;
    }
    if (pageChosen > 0) {
      const onPage = new Set(pageIds);
      onSelectionChange({
        ids: selection.allMatching
          ? []
          : selection.ids.filter((id) => !onPage.has(id)),
        allMatching: false,
      });
      return;
    }
    onSelectionChange({
      ids: [...selection.ids, ...pageIds],
      allMatching: false,
    });
  };

  const definitions = useMemo<ColumnDef<T>[]>(
    () => [
      ...(selectable
        ? [{ id: SELECT_ID, size: SELECT_WIDTH, header: () => null }]
        : []),
      ...columns.map((column) => ({
        id: column.id,
        size: column.width ?? PIN_WIDTH,
        header: () => column.header,
        cell: ({ row }: { row: { original: T } }) => column.cell(row.original),
      })),
    ],
    [columns, selectable],
  );
  const columnPinning = useMemo<ColumnPinningState>(() => {
    const start = columns.filter((c) => c.pin === "start").map((c) => c.id);
    const end = columns.filter((c) => c.pin === "end").map((c) => c.id);
    return {
      // The checkbox column stays with the pinned columns, before them.
      left: selectable && start.length > 0 ? [SELECT_ID, ...start] : start,
      right: end,
    };
  }, [columns, selectable]);
  const table = useReactTable({
    data: rows,
    columns: definitions,
    getRowId: (row) => getRowId(row),
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    state: { columnPinning },
  });
  const sorts = sortList(sort);

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
  const rowHeight = density === "compact" ? "h-9" : "h-12";
  const activatable = onRowClick !== undefined || rowHref !== undefined;
  // A table with pinned columns scrolls sideways, so its cells keep to one line.
  const nowrap = columns.some((column) => column.pin) && "whitespace-nowrap";
  const headers = table.getHeaderGroups()[0]?.headers ?? [];

  const activate = (row: T, event: React.MouseEvent | React.KeyboardEvent) => {
    if (onRowClick) {
      onRowClick(row);
      return;
    }
    const href = rowHref?.(row);
    if (href === undefined) {
      return;
    }
    if (event.metaKey || event.ctrlKey) {
      window.open(href, "_blank", "noopener");
    } else {
      router.push(href);
    }
  };

  const sortHeader = (column: DataTableColumn<T>, content: React.ReactNode) => {
    const field = column.sortField;
    if (field === undefined || !onSortChange) {
      return content;
    }
    const index = sorts.findIndex((s) => s.field === field);
    const direction = sorts[index]?.direction;
    return (
      <button
        type="button"
        title={multiSort ? t("sortHint") : undefined}
        className="group/sort inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        onClick={(event) => {
          onSortChange(
            multiSort
              ? nextMultiSort(sort, field, event.shiftKey)
              : nextSort(typeof sort === "string" ? sort : sort?.[0], field),
          );
        }}
      >
        {content}
        {direction === "ASC" && (
          <ArrowUp aria-hidden="true" className="size-3" />
        )}
        {direction === "DESC" && (
          <ArrowDown aria-hidden="true" className="size-3" />
        )}
        {direction === undefined && (
          <ChevronsUpDown
            aria-hidden="true"
            className="size-3 text-faint group-hover/sort:text-foreground"
          />
        )}
        {sorts.length > 1 && index >= 0 && (
          <>
            <span
              aria-hidden="true"
              className="text-meta text-muted-foreground tabular-nums"
            >
              {index + 1}
            </span>
            <span className="sr-only">
              {t("sortPriority", { priority: index + 1 })}
            </span>
          </>
        )}
      </button>
    );
  };

  const ariaSort = (column: DataTableColumn<T> | undefined) => {
    if (column?.sortField === undefined) {
      return undefined;
    }
    const direction = sorts.find(
      (s) => s.field === column.sortField,
    )?.direction;
    return direction === "ASC"
      ? "ascending"
      : direction === "DESC"
        ? "descending"
        : "none";
  };

  const pinnedBg =
    "bg-background group-hover/row:bg-raised group-data-[selected=true]/row:bg-accent";
  const pageAll = hasRows && pageChosen === pageIds.length;

  return (
    <div className="flex flex-col">
      {selectable && count > 0 && (
        <div className="mb-stack-sm flex flex-col gap-stack-xs">
          <BulkActionBar
            count={count}
            onClear={() => onSelectionChange?.(NO_SELECTION)}
          >
            {bulkActions?.(selection)}
          </BulkActionBar>
          {selectable === "multiple" &&
            (selection.allMatching ? (
              <p className="text-small text-muted-foreground">
                {t("allMatchingSelected", { total })}
              </p>
            ) : (
              pageAll &&
              total > selection.ids.length && (
                <p className="flex flex-wrap items-center gap-inline-sm text-small text-muted-foreground">
                  {t("pageSelected", { count: pageIds.length })}
                  <Button
                    variant="link"
                    size="xs"
                    className="px-0"
                    onClick={() =>
                      onSelectionChange?.({ ids: [], allMatching: true })
                    }
                  >
                    {t("selectAllMatching", { total })}
                  </Button>
                </p>
              )
            ))}
        </div>
      )}

      <div
        className={cn("hidden sm:block", !loading && !hasRows && "sm:hidden")}
      >
        <div
          className={cn(
            "overflow-x-auto",
            contained && "max-h-table-max overflow-y-auto overscroll-contain",
          )}
        >
          <table className="w-full border-collapse text-body">
            <caption className="sr-only">{caption}</caption>
            <thead className="sticky top-0 z-10 bg-background">
              <tr>
                {headers.map((header) => {
                  const column = byId.get(header.column.id);
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={ariaSort(column)}
                      style={pinStyle(header.column, widthOf(header.column.id))}
                      className={cn(
                        "h-9 bg-background px-3 text-small font-normal text-muted-foreground shadow-rule-inset",
                        nowrap,
                        column?.align === "end" ? "text-end" : "text-start",
                        column?.identity && "w-1/3",
                        header.column.id === SELECT_ID && "w-10",
                        pinClasses(header.column),
                      )}
                    >
                      {header.column.id === SELECT_ID
                        ? selectable === "multiple" && (
                            <Checkbox
                              aria-label={t("selectPage")}
                              disabled={loading || !hasRows}
                              checked={
                                pageAll
                                  ? true
                                  : pageChosen > 0
                                    ? "indeterminate"
                                    : false
                              }
                              onCheckedChange={togglePage}
                            />
                          )
                        : column
                          ? sortHeader(
                              column,
                              flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              ),
                            )
                          : null}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody aria-busy={loading || undefined}>
              {loading
                ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
                    <tr
                      key={index}
                      className={cn(
                        rowHeight,
                        "group/row border-t border-rule first:border-t-0",
                      )}
                    >
                      {headers.map((header) => {
                        const column = byId.get(header.column.id);
                        return (
                          <td
                            key={header.id}
                            style={pinStyle(
                              header.column,
                              widthOf(header.column.id),
                            )}
                            className={cn(
                              "px-3",
                              nowrap,
                              pinClasses(header.column),
                              header.column.getIsPinned() && "bg-background",
                            )}
                          >
                            {column && (
                              <SkeletonBar
                                className={cn(
                                  column.identity ? "w-2/3" : "w-1/2",
                                  column.align === "end" && "ms-auto",
                                )}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                : table.getRowModel().rows.map((row) => {
                    const selected = selectable ? isChosen(row.id) : false;
                    return (
                      <tr
                        key={row.id}
                        data-selected={selected || undefined}
                        data-activatable={activatable || undefined}
                        tabIndex={activatable ? 0 : undefined}
                        onClick={
                          activatable
                            ? (event) => {
                                if (opensRow(event)) {
                                  activate(row.original, event);
                                }
                              }
                            : undefined
                        }
                        onKeyDown={
                          activatable
                            ? (event) => {
                                if (
                                  event.key === "Enter" &&
                                  event.target === event.currentTarget
                                ) {
                                  activate(row.original, event);
                                }
                              }
                            : undefined
                        }
                        className={cn(
                          rowHeight,
                          "group/row border-t border-rule first:border-t-0 hover:bg-raised data-[selected=true]:bg-accent",
                          activatable &&
                            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                        )}
                      >
                        {row.getVisibleCells().map((cell) => {
                          const column = byId.get(cell.column.id);
                          const pinned = cell.column.getIsPinned();
                          return (
                            <td
                              key={cell.id}
                              style={pinStyle(
                                cell.column,
                                widthOf(cell.column.id),
                              )}
                              className={cn(
                                "px-3",
                                nowrap,
                                column?.align === "end" &&
                                  "text-end tabular-nums",
                                pinClasses(cell.column),
                                pinned && pinnedBg,
                              )}
                            >
                              {cell.column.id === SELECT_ID ? (
                                <Checkbox
                                  aria-label={t("selectRow", {
                                    name: label(row.original),
                                  })}
                                  checked={selected}
                                  onCheckedChange={() => {
                                    toggleRow(row.id);
                                  }}
                                />
                              ) : (
                                flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                )
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
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
            leading={
              selectable
                ? (row) => (
                    <Checkbox
                      aria-label={t("selectRow", { name: label(row) })}
                      checked={isChosen(getRowId(row))}
                      onCheckedChange={() => {
                        toggleRow(getRowId(row));
                      }}
                    />
                  )
                : undefined
            }
            onActivate={
              activatable
                ? (row, event) => {
                    if (opensRow(event)) {
                      activate(row, event);
                    }
                  }
                : undefined
            }
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
