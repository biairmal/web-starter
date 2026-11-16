"use client";

import { useId } from "react";
import type { FilterDef } from "@/components/filters/filters";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  const dateId = useId();

  if (def.type === "select") {
    return (
      <div role="listbox" aria-label={def.label} className="flex flex-col">
        {def.options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={option.value === value}
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
      <div className="flex flex-col gap-1 p-1">
        <label htmlFor={dateId} className="text-small text-muted-foreground">
          {def.label}
        </label>
        <Input
          id={dateId}
          type="date"
          value={value}
          {...(def.min ? { min: def.min } : {})}
          {...(def.max ? { max: def.max } : {})}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      </div>
    );
  }
  return <>{def.renderEditor({ value, onChange, onDone })}</>;
}
