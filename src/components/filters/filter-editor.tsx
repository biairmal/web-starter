"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import {
  decodeFilter,
  encodeFilter,
  type FilterDef,
  type FilterOperator,
  type FilterOption,
  isUsableDate,
  NUMBER_OPERATORS,
  TEXT_OPERATORS,
} from "@/components/filters/filters";
import { AsyncOptions } from "@/components/ui/async-combobox";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DateRangePanel,
  type IsoRange,
  RANGE_CLOSE_DELAY_MS,
} from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** The items of an applied value, or none for an unset filter. */
function itemsOf(value: string): string[] {
  return value === "" ? [] : decodeFilter(value).items;
}

/** Several options, applied together. */
function MultiSelectEditor({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly FilterOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("filterBar");
  const [draft, setDraft] = useState(() => new Set(itemsOf(value)));
  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label={label} className="flex flex-col">
        {options.map((option) => (
          // The checkbox is inside its label, so the whole row toggles it.
          <label
            key={option.value}
            className="flex min-h-9 items-center gap-2 rounded-sm px-2 text-body hover:bg-raised"
          >
            <Checkbox
              checked={draft.has(option.value)}
              onCheckedChange={(checked) => {
                setDraft((prev) => {
                  const next = new Set(prev);
                  if (checked === true) {
                    next.add(option.value);
                  } else {
                    next.delete(option.value);
                  }
                  return next;
                });
              }}
            />
            <span className="truncate">{option.label}</span>
          </label>
        ))}
      </div>
      <Button
        type="button"
        size="sm"
        onClick={() => {
          const chosen = options
            .map((option) => option.value)
            .filter((item) => draft.has(item));
          onChange(chosen.length > 0 ? encodeFilter("in", chosen) : "");
        }}
      >
        {t("apply")}
      </Button>
    </div>
  );
}

/** A server-searched list: one pick applies, or several with Apply. */
function AsyncEditor({
  def,
  value,
  onChange,
}: {
  def: Extract<FilterDef, { type: "async" }>;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("filterBar");
  const [draft, setDraft] = useState(() => itemsOf(value));
  if (!def.multiple) {
    return (
      <AsyncOptions
        fetchOptions={def.fetchOptions}
        selection={{
          value: draft[0] ?? null,
          onValueChange: (next) => {
            onChange(next ?? "");
          },
        }}
      />
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <AsyncOptions
        fetchOptions={def.fetchOptions}
        selection={{ multiple: true, value: draft, onValueChange: setDraft }}
      />
      <Button
        type="button"
        size="sm"
        onClick={() => {
          onChange(draft.length > 0 ? encodeFilter("in", draft) : "");
        }}
      >
        {t("apply")}
      </Button>
    </div>
  );
}

/** A range of days; applies a moment after the second day, so it is seen. */
function DateRangeEditor({
  def,
  value,
  onChange,
}: {
  def: Extract<FilterDef, { type: "dateRange" }>;
  value: string;
  onChange: (value: string) => void;
}) {
  const [from, to] = itemsOf(value);
  const [draft, setDraft] = useState<IsoRange | null>(
    from && to ? { from, to } : null,
  );
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );
  return (
    <DateRangePanel
      value={draft}
      min={def.min}
      max={def.max}
      numberOfMonths={1}
      onCommit={(range) => {
        setDraft(range);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          onChange(encodeFilter("between", [range.from, range.to]));
        }, RANGE_CLOSE_DELAY_MS);
      }}
    />
  );
}

/** An operator and a value (two for "between"), applied with Apply or Enter. */
function ConditionEditor({
  def,
  value,
  onChange,
}: {
  def: Extract<FilterDef, { type: "text" | "number" }>;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("filterBar");
  const operators: readonly FilterOperator[] =
    def.type === "text"
      ? (def.operators ?? TEXT_OPERATORS)
      : (def.operators ?? NUMBER_OPERATORS);
  const decoded = value === "" ? null : decodeFilter(value);
  const [op, setOp] = useState<FilterOperator>(
    decoded && operators.includes(decoded.op)
      ? decoded.op
      : (operators[0] ?? "eq"),
  );
  const [first, setFirst] = useState(decoded?.items[0] ?? "");
  const [second, setSecond] = useState(
    decoded?.op === "between" ? (decoded.items[1] ?? "") : "",
  );
  const between = op === "between";
  const usable = first.trim() !== "" && (!between || second.trim() !== "");
  const Field = def.type === "number" ? NumberInput : Input;

  return (
    <form
      className="flex flex-col gap-2 p-1"
      onSubmit={(event) => {
        event.preventDefault();
        if (!usable) {
          return;
        }
        onChange(
          between
            ? encodeFilter("between", [first.trim(), second.trim()])
            : encodeFilter(op, first.trim()),
        );
      }}
    >
      {operators.length > 1 && (
        <Select
          value={op}
          onValueChange={(next) => {
            setOp(operators.find((operator) => operator === next) ?? op);
          }}
        >
          <SelectTrigger aria-label={t("operator")} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {operators.map((operator) => (
              <SelectItem key={operator} value={operator}>
                {t(`op.${operator}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Field
        aria-label={def.label}
        value={first}
        autoComplete="off"
        // eslint-disable-next-line jsx-a11y/no-autofocus -- the panel just opened for this value
        autoFocus
        onChange={(event) => {
          setFirst(event.target.value);
        }}
      />
      {between && (
        <Field
          aria-label={t("and")}
          value={second}
          autoComplete="off"
          onChange={(event) => {
            setSecond(event.target.value);
          }}
        />
      )}
      <Button type="submit" size="sm" disabled={!usable}>
        {t("apply")}
      </Button>
    </form>
  );
}

/**
 * A date is edited as a draft. A native date input fires change as soon as its
 * value is a complete date, so typing "2026" would apply year 0002 after the
 * first digit; the draft is applied only with Apply or Enter, and only when it
 * is a sensible date inside the limits (typing by hand ignores min and max).
 */
function DateEditor({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min: string | undefined;
  max: string | undefined;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("filterBar");
  const id = useId();
  const [draft, setDraft] = useState(value);
  const usable = isUsableDate(draft, min, max);

  function commit() {
    if (usable) {
      onChange(draft);
    }
  }

  return (
    <div className="flex flex-col gap-2 p-1">
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-small text-muted-foreground">
          {label}
        </label>
        <Input
          id={id}
          type="date"
          value={draft}
          {...(min ? { min } : {})}
          {...(max ? { max } : {})}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
          }}
        />
      </div>
      <Button type="button" size="sm" disabled={!usable} onClick={commit}>
        {t("apply")}
      </Button>
    </div>
  );
}

/** The control that sets one filter's value, shown inside a FilterOverlay. */
export function FilterEditor({
  def,
  value,
  onChange,
  onDone,
}: {
  def: FilterDef;
  value: string;
  onChange: (value: string) => void;
  onDone: () => void;
}) {
  if (def.type === "select") {
    return (
      <div role="group" aria-label={def.label} className="flex flex-col">
        {def.options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            className={cn(
              "flex min-h-9 w-full items-center rounded-sm px-2 text-start text-body hover:bg-raised focus-visible:bg-raised focus-visible:outline-none",
              option.value === value && "bg-accent font-medium",
            )}
            onClick={() => {
              onChange(option.value);
            }}
          >
            <span className="truncate">{option.label}</span>
          </button>
        ))}
      </div>
    );
  }
  if (def.type === "date") {
    return (
      <DateEditor
        label={def.label}
        value={value}
        min={def.min}
        max={def.max}
        onChange={onChange}
      />
    );
  }
  if (def.type === "multiSelect") {
    return (
      <MultiSelectEditor
        label={def.label}
        options={def.options}
        value={value}
        onChange={onChange}
      />
    );
  }
  if (def.type === "async") {
    return <AsyncEditor def={def} value={value} onChange={onChange} />;
  }
  if (def.type === "dateRange") {
    return <DateRangeEditor def={def} value={value} onChange={onChange} />;
  }
  if (def.type === "text" || def.type === "number") {
    return <ConditionEditor def={def} value={value} onChange={onChange} />;
  }
  return <>{def.renderEditor({ value, onChange, onDone })}</>;
}
