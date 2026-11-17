"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Progress as ProgressPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

// Progress of one task. Give `value` (0 to `max`) when the amount is known;
// leave it null for "working, amount unknown", which slides a short bar. A
// progress bar always needs a `label` saying what is in progress.
function Progress({
  value,
  max = 100,
  label,
  className,
}: {
  value: number | null;
  max?: number;
  label: string;
  className?: string;
}) {
  const percent =
    value === null ? null : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      max={max}
      aria-label={label}
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full rounded-full bg-primary",
          percent === null
            ? "w-2/5 animate-progress motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-40"
            : "transition-all duration-200",
        )}
        style={percent === null ? undefined : { width: `${String(percent)}%` }}
      />
    </ProgressPrimitive.Root>
  );
}

/**
 * Where the user is in a fixed sequence (a setup wizard). `current` is the
 * index of the step in progress; earlier steps show as done.
 */
function ProgressSteps({
  steps,
  current,
  label,
  className,
}: {
  steps: readonly string[];
  current: number;
  label: string;
  className?: string;
}) {
  return (
    <ol
      aria-label={label}
      data-slot="progress-steps"
      className={cn("flex flex-wrap items-center gap-inline-sm", className)}
    >
      {steps.map((step, index) => {
        const state =
          index < current ? "done" : index === current ? "current" : "todo";
        return (
          <li
            key={step}
            data-state={state}
            aria-current={state === "current" ? "step" : undefined}
            className="group flex items-center gap-inline-sm text-meta text-muted-foreground data-[state=current]:font-medium data-[state=current]:text-foreground"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-small tabular-nums group-data-[state=current]:border-primary group-data-[state=current]:text-primary group-data-[state=done]:border-primary group-data-[state=done]:bg-primary group-data-[state=done]:text-primary-foreground">
              {state === "done" ? (
                <Check aria-hidden="true" className="size-3.5" />
              ) : (
                index + 1
              )}
            </span>
            {step}
            {index < steps.length - 1 && (
              <span aria-hidden="true" className="h-px w-6 bg-border" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export { Progress, ProgressSteps };
