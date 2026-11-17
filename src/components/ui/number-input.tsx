"use client";

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

// A numeric input: right-aligned tabular figures, a stepper inside the field's
// end edge, and an optional unit after the field (outside it, so a unit of any
// length never covers the value). The arrow keys step too; the stepper
// buttons stay out of the Tab order.
function NumberInput({
  unit,
  className,
  ref,
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & {
  unit?: React.ReactNode;
}) {
  const t = useTranslations("forms.number");
  const inner = React.useRef<HTMLInputElement>(null);
  React.useImperativeHandle(ref, () => inner.current as HTMLInputElement);
  const locked = Boolean(props.disabled) || Boolean(props.readOnly);

  const step = (direction: 1 | -1) => {
    const input = inner.current;
    if (!input) {
      return;
    }
    if (direction === 1) {
      input.stepUp();
    } else {
      input.stepDown();
    }
    // stepUp changes the DOM value only; the input event lets React (and
    // React Hook Form) see it as a user edit.
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  };

  const field = (
    <div
      data-slot="number-input"
      className={cn("relative w-full", !unit && className)}
    >
      <Input
        ref={inner}
        type="number"
        inputMode="decimal"
        className="pe-8 text-end tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        {...props}
      />
      <div className="absolute inset-y-px end-px flex w-6 flex-col overflow-hidden rounded-e-md border-s border-input">
        {(
          [
            [1, t("increase"), ChevronUp],
            [-1, t("decrease"), ChevronDown],
          ] as const
        ).map(([direction, label, Icon]) => (
          <button
            key={direction}
            type="button"
            tabIndex={-1}
            aria-label={label}
            aria-controls={props.id}
            disabled={locked}
            onClick={() => {
              step(direction);
            }}
            className="flex flex-1 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:bg-active disabled:opacity-50 [&_svg]:size-3.5"
          >
            <Icon aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
  if (!unit) {
    return field;
  }
  return (
    <div className={cn("flex items-center gap-inline-sm", className)}>
      {field}
      <span className="shrink-0 text-meta text-muted-foreground">{unit}</span>
    </div>
  );
}

export { NumberInput };
