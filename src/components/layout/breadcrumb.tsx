import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export type BreadcrumbItem = { label: ReactNode; href?: string };

/** Where a page sits: links up the trail, the last item is the current page. */
export function Breadcrumb({
  label,
  items,
}: {
  /** The navigation landmark's name, e.g. t("breadcrumb"). */
  label: string;
  items: readonly BreadcrumbItem[];
}) {
  return (
    <nav aria-label={label}>
      <ol className="flex min-w-0 items-center gap-inline-xs text-body text-muted-foreground">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={index} className="flex min-w-0 items-center gap-inline-xs">
              {index > 0 && (
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 rtl:rotate-180"
                />
              )}
              {last || item.href === undefined ? (
                <span
                  aria-current={last ? "page" : undefined}
                  className={last ? "truncate text-foreground" : "truncate"}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="truncate hover:text-foreground hover:underline"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
