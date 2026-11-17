import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";

// An input with text or icons before and after it (a currency, a unit, a
// search icon). `loading` swaps the suffix for a spinner and marks the input
// busy, for a search that is fetching.
function InputGroup({
  prefix,
  suffix,
  loading = false,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "prefix"> & {
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  loading?: boolean;
}) {
  const end = loading ? (
    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
  ) : (
    suffix
  );
  return (
    <div
      data-slot="input-group"
      className={cn("relative flex w-full items-center", className)}
    >
      {prefix && (
        <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-2.5 text-muted-foreground [&_svg]:size-4">
          {prefix}
        </span>
      )}
      <Input
        aria-busy={loading || undefined}
        className={cn(prefix && "ps-8", end && "pe-8")}
        {...props}
      />
      {end && (
        <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-2.5 text-muted-foreground [&_svg]:size-4">
          {end}
        </span>
      )}
    </div>
  );
}

export { InputGroup };
