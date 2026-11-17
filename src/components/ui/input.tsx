import * as React from "react";
import { cn } from "@/lib/utils";

// The border, hover, focus, invalid, disabled and read-only look that every
// text control shares (Input, Textarea, InputGroup).
const controlClasses =
  "w-full min-w-0 rounded-md border border-input bg-transparent text-base transition-colors outline-none hover:border-faint placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 read-only:bg-muted/40 read-only:hover:border-input aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        controlClasses,
        "h-input px-2.5 py-1 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Input, controlClasses };
