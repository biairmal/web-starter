import * as React from "react";
import { cn } from "cn";
import { controlClasses } from "@/components/ui/input";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        controlClasses,
        "field-sizing-content min-h-24 px-2.5 py-2",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
