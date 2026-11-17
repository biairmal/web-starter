import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * A titled block of a page: a hairline box, no shadow (DESIGN.md 4). Its
 * heading names the region for assistive technology.
 */
function Card({
  title,
  description,
  action,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** A control for the whole card, e.g. a search box or an Edit button. */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const titleId = useId();
  return (
    <section
      data-slot="card"
      aria-labelledby={titleId}
      className={cn(
        "flex flex-col gap-stack-md rounded-lg border border-border p-card-pad",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-inline-md">
        <div className="flex min-w-0 flex-col gap-stack-xs">
          <h2 id={titleId} className="text-section font-semibold">
            {title}
          </h2>
          {description && (
            <p className="text-meta text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export { Card };
