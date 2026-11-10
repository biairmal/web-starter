"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A submit button that shows a spinner while `pending` and keeps its label and
 * width. It is disabled only while pending, never because the form looks
 * incomplete, which would hide what is wrong (DESIGN_BRIEF 6.1).
 */
export function SubmitButton({
  pending,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "type" | "disabled"> & {
  pending: boolean;
}) {
  return (
    <Button
      {...props}
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={cn("relative", className)}
    >
      <span className={cn(pending && "invisible")}>{children}</span>
      {pending && (
        <Loader2
          aria-hidden="true"
          className="absolute inset-0 m-auto size-4 animate-spin"
        />
      )}
    </Button>
  );
}
