import type { ReactNode } from "react";
import type {
  FetchOptions,
  ResolveLabels,
} from "@/components/ui/async-combobox";

// What a list can be filtered by. A value is one string, kept in the URL by
// useListParams; an empty string means the filter is not applied. Filters
// with an operator use the list query format `field=value;op` (backend
// listquery): `in` and `between` values are comma-separated, each item
// URL-encoded, and a plain `eq` value has no suffix. Identity accepts no
// operators, so its lists use only select, date and custom.

export type FilterOption = { value: string; label: string };

type FilterBase = { key: string; label: string };

export type FilterOperator =
  "eq" | "ne" | "like" | "gt" | "gte" | "lt" | "lte" | "in" | "between";

export type TextOperator = "eq" | "ne" | "like";
export type NumberOperator =
  "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "between";

export type FilterDef = FilterBase &
  (
    | { type: "select"; options: readonly FilterOption[] }
    | {
        /** Any of several options: `a,b;in`. */
        type: "multiSelect";
        options: readonly FilterOption[];
      }
    | {
        /** Options from the server (the options endpoint): an id, or `a,b;in` with `multiple`. */
        type: "async";
        fetchOptions: FetchOptions;
        /** Names ids restored from the URL; without it the pill shows the id. */
        resolveLabels?: ResolveLabels;
        multiple?: boolean;
      }
    | {
        /** A range of days: `from,to;between`. */
        type: "dateRange";
        min?: string;
        max?: string;
      }
    | {
        /** Free text with an operator, `like` (contains) first by default. */
        type: "text";
        operators?: readonly TextOperator[];
      }
    | {
        /** A number with an operator, `eq` first by default. */
        type: "number";
        operators?: readonly NumberOperator[];
        /** How the pill shows a number, e.g. as currency. */
        formatValue?: (value: number) => string;
      }
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

const EARLIEST_DATE = "1900-01-01";

/**
 * Whether a typed date (yyyy-mm-dd) is complete, not absurdly early (typing a
 * year digit by digit passes through 0002), and inside the limits.
 */
export function isUsableDate(
  value: string,
  min?: string,
  max?: string,
): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    value >= EARLIEST_DATE &&
    (min === undefined || value >= min) &&
    (max === undefined || value <= max)
  );
}

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

const OPERATORS: readonly FilterOperator[] = [
  "eq",
  "ne",
  "like",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "between",
];

export const TEXT_OPERATORS: readonly TextOperator[] = ["like", "eq", "ne"];
export const NUMBER_OPERATORS: readonly NumberOperator[] = [
  "eq",
  "ne",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
];

/** One filter's value in the list query format, e.g. `100;gte` or `a,b;in`. */
export function encodeFilter(
  op: FilterOperator,
  value: string | readonly string[],
): string {
  const text =
    typeof value === "string"
      ? value
      : value.map((item) => encodeURIComponent(item)).join(",");
  // A plain value that happens to end in ";like" must not read as an operator.
  if (op === "eq" && !text.includes(";")) {
    return text;
  }
  return `${text};${op}`;
}

function decodeItem(item: string): string {
  try {
    return decodeURIComponent(item);
  } catch {
    return item;
  }
}

/** The operator and the value(s) of a filter value; no known suffix means `eq`. */
export function decodeFilter(raw: string): {
  op: FilterOperator;
  value: string;
  items: string[];
} {
  const at = raw.lastIndexOf(";");
  const suffix = at >= 0 ? raw.slice(at + 1) : "";
  const op = OPERATORS.find((known) => known === suffix) ?? "eq";
  const value = op === "eq" && suffix !== "eq" ? raw : raw.slice(0, at);
  const items =
    op === "in" || op === "between"
      ? value.split(",").filter(Boolean).map(decodeItem)
      : [value];
  return { op, value, items };
}
