"use client";

import * as React from "react";
import {
  endOfMonth,
  format,
  isValid,
  parseISO,
  startOfMonth,
  subDays,
} from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { controlClasses } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Date pickers. Values are ISO calendar dates ("2026-11-17"), the form the API
// takes, never Date objects or times, so no time zone can shift a day. The
// trigger shows the date in the app's locale and takes the id and aria-*
// props a FormField passes.

type DateTriggerProps = {
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string | undefined;
  "aria-required"?: boolean | undefined;
};

type IsoRange = { from: string; to: string };

function toIso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function fromIso(value: string): Date | undefined {
  const date = parseISO(value);
  return isValid(date) ? date : undefined;
}

function useDateText() {
  const locale = useLocale();
  return React.useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
    return {
      one: (value: string) => {
        const date = fromIso(value);
        return date ? formatter.format(date) : value;
      },
      range: (value: IsoRange) => {
        const from = fromIso(value.from);
        const to = fromIso(value.to);
        return from && to
          ? formatter.formatRange(from, to)
          : `${value.from} – ${value.to}`;
      },
    };
  }, [locale]);
}

function DateTrigger({
  text,
  placeholder,
  className,
  ...props
}: DateTriggerProps & {
  text: string | null;
} & Omit<React.ComponentProps<"button">, "children">) {
  return (
    <button
      type="button"
      data-slot="date-trigger"
      className={cn(
        controlClasses,
        "flex h-input items-center gap-inline-sm px-3 text-start",
        className,
      )}
      {...props}
    >
      <CalendarIcon
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground"
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          text === null && "text-muted-foreground",
        )}
      >
        {text ?? placeholder}
      </span>
    </button>
  );
}

/** Days outside min and max (ISO dates) cannot be picked. */
function limits(min?: string, max?: string) {
  const before = min === undefined ? undefined : fromIso(min);
  const after = max === undefined ? undefined : fromIso(max);
  return [...(before ? [{ before }] : []), ...(after ? [{ after }] : [])];
}

function DatePicker({
  value,
  onValueChange,
  min,
  max,
  placeholder,
  ...triggerProps
}: DateTriggerProps & {
  value: string | null;
  onValueChange: (value: string | null) => void;
  min?: string;
  max?: string;
}) {
  const t = useTranslations("forms.date");
  const text = useDateText();
  const [open, setOpen] = React.useState(false);
  const selected = value === null ? undefined : fromIso(value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <DateTrigger
          {...triggerProps}
          text={value === null ? null : text.one(value)}
          placeholder={placeholder ?? t("placeholder")}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          // eslint-disable-next-line jsx-a11y/no-autofocus -- the popover just opened; focus goes to the chosen day, not the month button
          autoFocus
          selected={selected}
          defaultMonth={selected}
          disabled={limits(min, max)}
          onSelect={(date) => {
            onValueChange(date ? toIso(date) : null);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function rangePresets(today: Date) {
  return [
    { key: "today", from: today, to: today },
    { key: "last7", from: subDays(today, 6), to: today },
    { key: "last30", from: subDays(today, 29), to: today },
    { key: "thisMonth", from: startOfMonth(today), to: endOfMonth(today) },
  ] as const;
}

/** How long a finished range stays in view before the picker closes. */
const RANGE_CLOSE_DELAY_MS = 250;

/**
 * A start and end date. Each opening picks a new range: the first click is
 * the start, the second the end (either order), and the value changes only
 * then. The old range stays highlighted until the first click. `presets` adds
 * quick ranges (today, last 7 and 30 days, this month).
 */
/**
 * Presets and a calendar for a range: the first click is the start (the old
 * range leaves the view), the second the end, in either order. Used by
 * DateRangePicker and shown inline by the date range filter.
 */
function DateRangePanel({
  value,
  onCommit,
  min,
  max,
  presets = true,
  numberOfMonths = 2,
}: {
  value: IsoRange | null;
  onCommit: (value: IsoRange) => void;
  min?: string | undefined;
  max?: string | undefined;
  presets?: boolean;
  numberOfMonths?: number;
}) {
  const t = useTranslations("forms.date");
  // The start clicked since the panel opened; null until the first click.
  const [start, setStart] = React.useState<Date | null>(null);
  const committed: DateRange | undefined = value
    ? { from: fromIso(value.from), to: fromIso(value.to) }
    : undefined;
  const shown: DateRange | undefined = start
    ? { from: start, to: start }
    : committed;
  const commit = (from: Date, to: Date) => {
    setStart(null);
    onCommit({ from: toIso(from), to: toIso(to) });
  };

  return (
    <div className="flex flex-col sm:flex-row">
      {presets && (
        <div
          role="group"
          aria-label={t("presets")}
          className="flex flex-wrap gap-1 border-b border-rule p-2 sm:w-36 sm:flex-col sm:flex-nowrap sm:border-e sm:border-b-0"
        >
          {rangePresets(new Date()).map((preset) => (
            <Button
              key={preset.key}
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() => {
                commit(preset.from, preset.to);
              }}
            >
              {t(preset.key)}
            </Button>
          ))}
        </div>
      )}
      <Calendar
        mode="range"
        // eslint-disable-next-line jsx-a11y/no-autofocus -- the panel just opened; focus goes to the chosen day, not the month button
        autoFocus
        numberOfMonths={numberOfMonths}
        selected={shown}
        defaultMonth={committed?.from}
        disabled={limits(min, max)}
        onSelect={(_range, day) => {
          if (start === null) {
            setStart(day);
          } else if (day.getTime() < start.getTime()) {
            commit(day, start);
          } else {
            commit(start, day);
          }
        }}
      />
    </div>
  );
}

function DateRangePicker({
  value,
  onValueChange,
  min,
  max,
  presets = true,
  placeholder,
  ...triggerProps
}: DateTriggerProps & {
  value: IsoRange | null;
  onValueChange: (value: IsoRange | null) => void;
  min?: string;
  max?: string;
  presets?: boolean;
}) {
  const t = useTranslations("forms.date");
  const text = useDateText();
  const [open, setOpen] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  React.useEffect(
    () => () => {
      clearTimeout(closeTimer.current);
    },
    [],
  );

  const changeOpen = (next: boolean) => {
    clearTimeout(closeTimer.current);
    setOpen(next);
  };

  const commit = (range: IsoRange) => {
    onValueChange(range);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setOpen(false);
    }, RANGE_CLOSE_DELAY_MS);
  };

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <DateTrigger
          {...triggerProps}
          text={value === null ? null : text.range(value)}
          placeholder={placeholder ?? t("rangePlaceholder")}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-dvw p-0">
        <div className="flex flex-col">
          <DateRangePanel
            value={value}
            onCommit={commit}
            min={min}
            max={max}
            presets={presets}
          />
          {value !== null && (
            <div className="flex justify-end border-t border-rule p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onValueChange(null);
                  changeOpen(false);
                }}
              >
                {t("clear")}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Any number of separate days; the list stays open while you pick. */
function MultiDatePicker({
  value,
  onValueChange,
  min,
  max,
  placeholder,
  ...triggerProps
}: DateTriggerProps & {
  value: string[];
  onValueChange: (value: string[]) => void;
  min?: string;
  max?: string;
}) {
  const t = useTranslations("forms.date");
  const text = useDateText();
  const selected = value
    .map(fromIso)
    .filter((date): date is Date => date !== undefined);
  const label =
    value.length === 0
      ? null
      : value.length === 1
        ? text.one(value[0] ?? "")
        : t("count", { count: value.length });
  return (
    <Popover>
      <PopoverTrigger asChild>
        <DateTrigger
          {...triggerProps}
          text={label}
          placeholder={placeholder ?? t("multiPlaceholder")}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="multiple"
          // Separate days, so two chosen side by side do not read as a range.
          classNames={{ weekdays: "flex gap-0.5", week: "mt-0.5 flex gap-0.5" }}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- the popover just opened; focus goes to the chosen day, not the month button
          autoFocus
          selected={selected}
          defaultMonth={selected[0]}
          disabled={limits(min, max)}
          onSelect={(dates) => {
            onValueChange((dates ?? []).map(toIso).sort());
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export {
  DateRangePanel,
  RANGE_CLOSE_DELAY_MS,
  DatePicker,
  DateRangePicker,
  MultiDatePicker,
  type IsoRange,
};
