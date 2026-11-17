"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Row selection for a server-paged table. It is kept by row id outside the
// table, so it survives paging. `allMatching` means every row the current
// filter matches, on any page: a bulk action then sends the filter, not ids.

export type RowSelection = {
  ids: readonly string[];
  allMatching: boolean;
};

export const NO_SELECTION: RowSelection = { ids: [], allMatching: false };

/** How many rows the selection covers, given the filter's total. */
export function selectionCount(selection: RowSelection, total: number) {
  return selection.allMatching ? total : selection.ids.length;
}

/**
 * Selection state that clears when `resetKey` changes: pass the filters
 * (and anything else that changes which rows match), so a selection made
 * under one filter never carries into another.
 */
export function useRowSelection(resetKey: string) {
  const [selection, setSelection] = useState<RowSelection>(NO_SELECTION);
  const key = useRef(resetKey);
  useEffect(() => {
    if (key.current !== resetKey) {
      key.current = resetKey;
      setSelection(NO_SELECTION);
    }
  }, [resetKey]);
  return [selection, setSelection] as const;
}

/** The count, the bulk actions and Clear, shown while rows are selected. */
export function BulkActionBar({
  count,
  onClear,
  children,
  className,
}: {
  count: number;
  onClear: () => void;
  /** The bulk actions, usually small outline buttons. */
  children?: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations("dataTable");
  return (
    <div
      data-slot="bulk-action-bar"
      className={cn(
        "flex min-h-button-lg flex-wrap items-center gap-inline-md rounded-md border border-border bg-raised px-inset-sm py-stack-xs",
        className,
      )}
    >
      <span aria-live="polite" className="text-body font-medium tabular-nums">
        {t("selected", { count })}
      </span>
      <div className="flex flex-wrap items-center gap-inline-sm">
        {children}
      </div>
      <Button variant="ghost" size="sm" className="ms-auto" onClick={onClear}>
        <X aria-hidden="true" />
        {t("clearSelection")}
      </Button>
    </div>
  );
}
