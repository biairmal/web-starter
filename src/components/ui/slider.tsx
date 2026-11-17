"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Slider as SliderPrimitive } from "radix-ui";

// One thumb per value: pass two values for a range. Each thumb gets its
// accessible name from `thumbLabels`.
function Slider({
  className,
  thumbLabels,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  thumbLabels: string[];
}) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        "relative flex w-full touch-none items-center py-2 select-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {thumbLabels.map((label) => (
        <SliderPrimitive.Thumb
          key={label}
          aria-label={label}
          className="block size-4 rounded-full border border-primary bg-background transition-shadow outline-none hover:ring-3 hover:ring-ring/30 focus-visible:ring-3 focus-visible:ring-ring/50 data-[disabled]:pointer-events-none"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
