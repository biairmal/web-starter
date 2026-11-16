"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { type FilterDef, isUsableDate } from "@/components/filters/filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  return <>{def.renderEditor({ value, onChange, onDone })}</>;
}
