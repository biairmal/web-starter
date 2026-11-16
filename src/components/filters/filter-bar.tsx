"use client";

import { Plus, Search, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useId } from "react";
import {
  activeFilters,
  type FilterDef,
  type FilterValues,
  inactiveFilters,
} from "@/components/filters/filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// The toolbar above a list: a search box, one removable pill per applied
// filter, "Add filter" for the rest, and "Clear filters". Values are the
// list's URL state (useListParams); this component only shows and changes them.

export function FilterBar({
  search,
  filters,
  values,
  onChange,
  onClear,
  className,
}: {
  search?: {
    value: string;
    onChange: (value: string) => void;
    /** The search box's accessible name, e.g. "Search by name". */
    label: string;
    placeholder?: string;
  };
  filters: readonly FilterDef[];
  values: FilterValues;
  /** Sets one filter; an empty value removes it. */
  onChange: (key: string, value: string) => void;
  onClear: () => void;
  className?: string;
}) {
  const t = useTranslations("filterBar");
  const format = useFormatter();
  const searchId = useId();
  const applied = activeFilters(filters, values);
  const unset = inactiveFilters(filters, values);

  /** What a pill says for a filter's value. A value that matches no option is shown as it is. */
  function valueText(def: FilterDef, value: string): React.ReactNode {
    if (def.type === "select") {
      return (
        def.options.find((option) => option.value === value)?.label ?? value
      );
    }
    if (def.type === "date") {
      return format.dateTime(new Date(`${value}T00:00:00Z`), {
        dateStyle: "medium",
        timeZone: "UTC",
      });
    }
    return def.renderValue(value);
  }

  return (
    <div
      data-slot="filter-bar"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {search && (
        <div className="relative w-full sm:w-72">
          <label htmlFor={searchId} className="sr-only">
            {search.label}
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id={searchId}
            type="search"
            value={search.value}
            placeholder={search.placeholder ?? search.label}
            autoComplete="off"
            spellCheck={false}
            className="ps-8"
            onChange={(event) => {
              search.onChange(event.target.value);
            }}
          />
        </div>
      )}
      {applied.map((def) => {
        const value = values[def.key] ?? "";
        const text = valueText(def, value);
        const title =
          typeof text === "string" ? `${def.label}: ${text}` : undefined;
        return (
          <div
            key={def.key}
            className="inline-flex h-8 max-w-full items-center rounded-full bg-accent text-small font-medium text-foreground"
          >
            <button
              type="button"
              title={title}
              className="max-w-48 truncate rounded-s-full ps-3 pe-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {def.label}
              {": "}
              {text}
            </button>
            <button
              type="button"
              aria-label={t("remove", { label: def.label })}
              className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-active focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              onClick={() => {
                onChange(def.key, "");
              }}
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        );
      })}
      {unset.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-dashed"
        >
          <Plus aria-hidden="true" />
          {t("addFilter")}
        </Button>
      )}
      {applied.length > 0 && (
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          {t("clearFilters")}
        </Button>
      )}
    </div>
  );
}
