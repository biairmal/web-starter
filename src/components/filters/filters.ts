import type { ReactNode } from "react";

// What a list can be filtered by. A value is one string, kept in the URL by
// useListParams; an empty string means the filter is not applied.

export type FilterOption = { value: string; label: string };

type FilterBase = { key: string; label: string };

export type FilterDef = FilterBase &
  (
    | { type: "select"; options: readonly FilterOption[] }
    | {
        type: "date";
        /** The earliest and latest date the editor accepts (yyyy-mm-dd). */
        min?: string;
        max?: string;
      }
    | {
        /** For a feature's own picker, e.g. the audit log's actor search. */
        type: "custom";
        /** What the pill shows for a value, e.g. a name looked up from an id. */
        renderValue: (value: string) => ReactNode;
        renderEditor: (args: {
          value: string;
          onChange: (value: string) => void;
          onDone: () => void;
        }) => ReactNode;
      }
  );

export type FilterValues = Readonly<Record<string, string>>;

/** The filters that have a value, in definition order. */
export function activeFilters(
  defs: readonly FilterDef[],
  values: FilterValues,
): FilterDef[] {
  return defs.filter((def) => (values[def.key] ?? "") !== "");
}

/** The filters that have no value yet, in definition order. */
export function inactiveFilters(
  defs: readonly FilterDef[],
  values: FilterValues,
): FilterDef[] {
  return defs.filter((def) => (values[def.key] ?? "") === "");
}
