import * as React from "react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";

// A numeric input: right-aligned tabular figures, and an optional unit after
// the field (outside it, so a unit of any length never covers the value). The
// native stepper and the arrow keys change the value.
function NumberInput({
  unit,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & {
  unit?: React.ReactNode;
}) {
  const input = (
    <Input
      type="number"
      inputMode="decimal"
      className={cn("text-end tabular-nums", !unit && className)}
      {...props}
    />
  );
  if (!unit) {
    return input;
  }
  return (
    <div
      data-slot="number-input"
      className={cn("flex items-center gap-inline-sm", className)}
    >
      {input}
      <span className="shrink-0 text-meta text-muted-foreground">{unit}</span>
    </div>
  );
}

export { NumberInput };
