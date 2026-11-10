import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Nothing to show yet, or a filter matched nothing (DESIGN_BRIEF 6.6): a small
 * icon, one sentence in the product's words, one line of explanation and the
 * action. Use different copy and action for "no match" than for "none yet".
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-1 py-10 text-body",
        className,
      )}
    >
      {Icon && <Icon aria-hidden="true" className="mb-2 size-5 text-faint" />}
      <p className="text-section font-medium">{title}</p>
      {description && <p className="text-muted-foreground">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
