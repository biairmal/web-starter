"use client";

import type { FilterOption } from "@/components/filters/filters";
import { cn } from "@/lib/utils";

/**
 * Tabs for one filter that is always visible, such as a status: a row of
 * buttons with the current one underlined in the accent. `""` is the "All"
 * tab. The row can scroll sideways on a narrow screen, so nothing may stick
 * out of its box: overflow-x-auto makes the other axis auto as well, and a
 * tab overlapping a border below would show a vertical scrollbar. The rule is
 * therefore an inset shadow, not a border.
 */
export function FilterTabs({
  label,
  value,
  options,
  onChange,
  className,
}: {
  /** The group's accessible name, e.g. "Membership". */
  label: string;
  value: string;
  options: readonly FilterOption[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex gap-4 overflow-x-auto overflow-y-hidden shadow-rule-inset",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value || "all"}
            type="button"
            aria-pressed={active}
            onClick={() => {
              onChange(option.value);
            }}
            className={cn(
              "h-9 shrink-0 border-b-2 text-body focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:outline-none",
              active
                ? "border-brand-accent font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
