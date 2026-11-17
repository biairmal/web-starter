"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { controlClasses } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// A select you can type into. One value (`value: string | null`) or many
// (`multiple`, `value: string[]`); many shows the first `maxChips` labels as
// chips and "+N" for the rest. Picking a chosen option again unchooses it.
// The trigger takes the id and aria-* props a FormField passes.

type ComboboxOption = { value: string; label: string; disabled?: boolean };

type ComboboxSelection =
  | {
      multiple?: false;
      value: string | null;
      onValueChange: (value: string | null) => void;
    }
  | {
      multiple: true;
      value: string[];
      onValueChange: (value: string[]) => void;
    };

type ComboboxTriggerProps = {
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  maxChips?: number;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string | undefined;
  "aria-required"?: boolean | undefined;
};

function selectedValues(selection: ComboboxSelection): string[] {
  if (selection.multiple) {
    return selection.value;
  }
  return selection.value === null ? [] : [selection.value];
}

/** Applies a pick to the selection; returns true when the popover should close. */
function pick(selection: ComboboxSelection, value: string): boolean {
  if (selection.multiple) {
    selection.onValueChange(
      selection.value.includes(value)
        ? selection.value.filter((v) => v !== value)
        : [...selection.value, value],
    );
    return false;
  }
  selection.onValueChange(selection.value === value ? null : value);
  return true;
}

/** The button that shows the choice and opens the list. */
function ComboboxTrigger({
  labels,
  multiple,
  open,
  placeholder,
  maxChips = 2,
  className,
  "aria-controls": ariaControls,
  ...props
}: ComboboxTriggerProps & {
  labels: string[];
  multiple: boolean;
  open: boolean;
} & Omit<React.ComponentProps<"button">, "children">) {
  const t = useTranslations("forms.picker");
  const shown = labels.slice(0, maxChips);
  const rest = labels.length - shown.length;
  return (
    <button
      type="button"
      role="combobox"
      aria-expanded={open}
      aria-controls={ariaControls}
      data-slot="combobox-trigger"
      className={cn(
        controlClasses,
        "flex min-h-input items-center gap-inline-sm px-3 py-1 text-start",
        className,
      )}
      {...props}
    >
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {labels.length === 0 ? (
          <span className="truncate text-muted-foreground">
            {placeholder ?? t("placeholder")}
          </span>
        ) : multiple ? (
          <>
            {shown.map((label) => (
              <span
                key={label}
                className="max-w-40 truncate rounded-sm bg-muted px-1.5 text-small leading-5"
              >
                {label}
              </span>
            ))}
            {rest > 0 && (
              <span className="rounded-sm bg-muted px-1.5 text-small leading-5 tabular-nums">
                {t("more", { count: rest })}
              </span>
            )}
          </>
        ) : (
          <span className="truncate">{labels[0]}</span>
        )}
      </span>
      <ChevronsUpDown
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground"
      />
    </button>
  );
}

/** One option row, with a check when it is chosen. */
function ComboboxItem({
  option,
  selected,
  onPick,
}: {
  option: ComboboxOption;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <CommandItem
      value={option.value}
      keywords={[option.label]}
      disabled={option.disabled}
      aria-checked={selected}
      onSelect={onPick}
    >
      <span className="min-w-0 flex-1 truncate">{option.label}</span>
      <Check
        aria-hidden="true"
        className={cn("text-primary", !selected && "invisible")}
      />
    </CommandItem>
  );
}

function Combobox({
  options,
  searchPlaceholder,
  emptyText,
  ...rest
}: ComboboxSelection &
  ComboboxTriggerProps & {
    options: readonly ComboboxOption[];
    searchPlaceholder?: string;
    emptyText?: string;
  }) {
  const t = useTranslations("forms.picker");
  const [open, setOpen] = React.useState(false);
  const { multiple, value, onValueChange, ...triggerProps } = rest;
  const selection = { multiple, value, onValueChange } as ComboboxSelection;
  const chosen = selectedValues(selection);
  const labels = chosen.map(
    (v) => options.find((option) => option.value === v)?.label ?? v,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ComboboxTrigger
          {...triggerProps}
          labels={labels}
          multiple={multiple === true}
          open={open}
        />
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-56 p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder ?? t("search")} />
          <CommandList aria-multiselectable={multiple === true || undefined}>
            <CommandEmpty>{emptyText ?? t("empty")}</CommandEmpty>
            {options.map((option) => (
              <ComboboxItem
                key={option.value}
                option={option}
                selected={chosen.includes(option.value)}
                onPick={() => {
                  if (pick(selection, option.value)) {
                    setOpen(false);
                  }
                }}
              />
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export {
  Combobox,
  ComboboxItem,
  ComboboxTrigger,
  pick,
  selectedValues,
  type ComboboxOption,
  type ComboboxSelection,
  type ComboboxTriggerProps,
};
