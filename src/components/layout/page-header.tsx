import { cn } from "@/lib/utils";

// The top of a page: its one heading, a sentence about it, and the page's
// primary action at the end. A server component, so it adds no client code to
// the pages that use it.

export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** The page's primary action, e.g. an Invite button. */
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-title font-semibold break-words">{title}</h1>
        {description && (
          <p className="text-body text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
