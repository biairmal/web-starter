import { cn } from "@/lib/utils";

/**
 * Cancel and Save at the end of a form, repeating the ones in a sticky
 * `PageHeader` for someone who scrolled to the bottom (DESIGN.md 5). Primary
 * action last, so it sits at the end of the row.
 */
export function FormActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="form-actions"
      className={cn(
        "flex flex-wrap items-center justify-end gap-inline-sm border-t border-rule pt-stack-md",
        className,
      )}
    >
      {children}
    </div>
  );
}
