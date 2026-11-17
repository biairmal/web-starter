import { cn } from "@/lib/utils";

// The top of a page: an optional breadcrumb, its one heading, a sentence about
// it, and the page's actions at the end. An edit screen makes it `sticky` so
// Cancel and Save stay in view while the form scrolls (DESIGN.md 5). Renders
// on the server or the client; it holds no state.

export function PageHeader({
  title,
  description,
  action,
  breadcrumb,
  status,
  sticky = false,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** The page's actions, e.g. an Invite button, or Cancel and Save. */
  action?: React.ReactNode;
  /** A `Breadcrumb` above the title. */
  breadcrumb?: React.ReactNode;
  /** Shown before the actions, e.g. "Unsaved changes". */
  status?: React.ReactNode;
  /** Pins the header to the top of the sheet from 640px up. */
  sticky?: boolean;
  className?: string;
}) {
  return (
    <div
      data-slot="page-header"
      className={cn(
        "flex flex-col gap-stack-sm",
        sticky &&
          "sm:sticky sm:top-0 sm:z-20 sm:border-b sm:border-rule sm:bg-background sm:py-stack-md",
        className,
      )}
    >
      {breadcrumb}
      <div className="flex flex-wrap items-start justify-between gap-x-inline-lg gap-y-stack-sm">
        <div className="flex min-w-0 flex-col gap-stack-xs">
          <h1 className="text-title font-semibold break-words">{title}</h1>
          {description && (
            <p className="text-body text-muted-foreground">{description}</p>
          )}
        </div>
        {(Boolean(status) || Boolean(action)) && (
          <div className="flex flex-wrap items-center gap-inline-md">
            {status}
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
