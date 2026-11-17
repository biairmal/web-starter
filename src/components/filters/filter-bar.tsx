"use client";

import { Plus, Search, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { FilterEditor } from "@/components/filters/filter-editor";
import { FilterOverlay } from "@/components/filters/filter-overlay";
import {
  activeFilters,
  decodeFilter,
  type FilterDef,
  type FilterValues,
  inactiveFilters,
} from "@/components/filters/filters";
import {
  type ResolveLabels,
  useOptionLabels,
} from "@/components/ui/async-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/** The names of server options, looked up from their ids. */
function AsyncLabels({
  ids,
  resolve,
}: {
  ids: string[];
  resolve: ResolveLabels | undefined;
}) {
  const t = useTranslations("filterBar");
  const labels = useOptionLabels(ids, resolve).of;
  return (
    <>
      {listText(ids.map(labels), (first, count) => t("more", { first, count }))}
    </>
  );
}

/** "A, B" or "A, B +3": a pill stays short however many values it has. */
function listText(
  labels: string[],
  more: (first: string, count: number) => string,
): string {
  return labels.length > 2
    ? more(labels.slice(0, 2).join(", "), labels.length - 2)
    : labels.join(", ");
}

// The toolbar above a list: a search box, one removable pill per applied
// filter, "Add filter" for the rest, and "Clear filters". Values are the
// list's URL state (useListParams); this component only shows and changes them.

/** Where keyboard focus goes once the pill or button it names is on screen. */
type FocusTarget = { kind: "pill"; key: string } | { kind: "add" };

const ADD = "add";

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
    /** Shows a spinner while the results for the typed search load. */
    loading?: boolean;
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

  // Which panel is open: a pill's editor (by filter key) or the add-filter
  // panel, and in that one, which filter was picked.
  const [openId, setOpenId] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const pillRefs = useRef(new Map<string, HTMLButtonElement | null>());
  const addRef = useRef<HTMLButtonElement | null>(null);

  // Focus the target as soon as it exists. The list's URL, and so the pills,
  // can change a moment after the click that caused it.
  useEffect(() => {
    if (!focusTarget) {
      return;
    }
    const element =
      focusTarget.kind === "add"
        ? addRef.current
        : pillRefs.current.get(focusTarget.key);
    if (element) {
      element.focus();
      setFocusTarget(null);
    }
  }, [focusTarget, values]);

  /** What a pill says for a filter's value. A value that matches no option is shown as it is. */
  function valueText(def: FilterDef, value: string): React.ReactNode {
    if (def.type === "select") {
      return (
        def.options.find((option) => option.value === value)?.label ?? value
      );
    }
    if (def.type === "date") {
      return day(value);
    }
    if (def.type === "custom") {
      return def.renderValue(value);
    }
    const { op, items } = decodeFilter(value);
    if (def.type === "multiSelect") {
      return listText(
        items.map(
          (item) =>
            def.options.find((option) => option.value === item)?.label ?? item,
        ),
        (first, count) => t("more", { first, count }),
      );
    }
    if (def.type === "async") {
      return <AsyncLabels ids={items} resolve={def.resolveLabels} />;
    }
    if (def.type === "dateRange") {
      const [from = "", to = ""] = items;
      return format.dateTimeRange(dayDate(from), dayDate(to), {
        dateStyle: "medium",
        timeZone: "UTC",
      });
    }
    if (def.type === "number") {
      const show = (item: string) => {
        const number = Number(item);
        return Number.isFinite(number)
          ? (def.formatValue?.(number) ?? format.number(number))
          : item;
      };
      return op === "between"
        ? items.map(show).join("–")
        : show(items[0] ?? "");
    }
    return items[0] ?? "";
  }

  /** "Label: value", or "Label at least value" for an operator other than is / is any of. */
  function pillLabel(def: FilterDef, value: string): string {
    const op =
      def.type === "text" || def.type === "number"
        ? decodeFilter(value).op
        : "eq";
    return op === "eq" || op === "in" || op === "between"
      ? `${def.label}: `
      : `${def.label} ${t(`op.${op}`)} `;
  }

  function dayDate(value: string) {
    return new Date(`${value}T00:00:00Z`);
  }

  function day(value: string) {
    return format.dateTime(dayDate(value), {
      dateStyle: "medium",
      timeZone: "UTC",
    });
  }

  function close() {
    setOpenId(null);
    setPicked(null);
  }

  function apply(def: FilterDef, value: string) {
    // An editor that empties its value removes the filter: its pill goes away,
    // so focus has to be placed the way a removal places it.
    if (value === "") {
      close();
      remove(def);
      return;
    }
    // A newly added filter gets a pill; focus it instead of the add button.
    if ((values[def.key] ?? "") === "") {
      setFocusTarget({ kind: "pill", key: def.key });
    }
    onChange(def.key, value);
    close();
  }

  function remove(def: FilterDef) {
    const index = applied.findIndex((item) => item.key === def.key);
    const next = applied[index + 1];
    setFocusTarget(next ? { kind: "pill", key: next.key } : { kind: "add" });
    onChange(def.key, "");
  }

  const pickedDef = unset.find((def) => def.key === picked);

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
            className={cn("ps-8", search.loading && "pe-8")}
            onChange={(event) => {
              search.onChange(event.target.value);
            }}
          />
          {search.loading && (
            <Spinner className="absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          )}
        </div>
      )}
      {applied.map((def) => {
        const value = values[def.key] ?? "";
        const text = valueText(def, value);
        const prefix = pillLabel(def, value);
        const title = typeof text === "string" ? `${prefix}${text}` : undefined;
        return (
          <div
            key={def.key}
            className="inline-flex h-8 max-w-full items-center rounded-full bg-accent text-small font-medium text-foreground"
          >
            <FilterOverlay
              open={openId === def.key}
              onOpenChange={(open) => {
                setOpenId(open ? def.key : null);
              }}
              title={def.label}
              onCloseAutoFocus={(event) => {
                if (focusTarget) {
                  event.preventDefault();
                }
              }}
              trigger={
                <button
                  type="button"
                  title={title}
                  ref={(element) => {
                    pillRefs.current.set(def.key, element);
                  }}
                  className="max-w-48 truncate rounded-s-full ps-3 pe-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {prefix}
                  {text}
                </button>
              }
            >
              <FilterEditor
                def={def}
                value={value}
                onChange={(next) => {
                  apply(def, next);
                }}
                onDone={close}
              />
            </FilterOverlay>
            <button
              type="button"
              aria-label={t("remove", { label: def.label })}
              className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-active focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              onClick={() => {
                remove(def);
              }}
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        );
      })}
      {unset.length > 0 && (
        <FilterOverlay
          open={openId === ADD}
          onOpenChange={(open) => {
            setOpenId(open ? ADD : null);
            setPicked(null);
          }}
          title={pickedDef?.label ?? t("addFilter")}
          onCloseAutoFocus={(event) => {
            if (focusTarget) {
              event.preventDefault();
            }
          }}
          trigger={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-dashed"
              ref={addRef}
            >
              <Plus aria-hidden="true" />
              {t("addFilter")}
            </Button>
          }
        >
          {pickedDef ? (
            <FilterEditor
              def={pickedDef}
              value=""
              onChange={(next) => {
                apply(pickedDef, next);
              }}
              onDone={close}
            />
          ) : (
            <div className="flex flex-col">
              {unset.map((def) => (
                <button
                  key={def.key}
                  type="button"
                  className="flex min-h-9 w-full items-center rounded-sm px-2 text-start text-body hover:bg-raised focus-visible:bg-raised focus-visible:outline-none"
                  onClick={() => {
                    setPicked(def.key);
                  }}
                >
                  {def.label}
                </button>
              ))}
            </div>
          )}
        </FilterOverlay>
      )}
      {(applied.length > 0 || (search?.value ?? "") !== "") && (
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          {t("clearFilters")}
        </Button>
      )}
    </div>
  );
}
