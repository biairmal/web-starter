import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// Loading placeholders (DESIGN_BRIEF 6.6): flat bars at the height of what
// they replace, no shimmer, so nothing shifts when the data arrives.

export function SkeletonBar({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block h-3.5 rounded-sm bg-raised", className)}
    />
  );
}

/** A page's title row and a list of rows, for a whole screen that is loading. */
export function PageSkeleton({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  const t = useTranslations("feedback");
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn("flex flex-col gap-6", className)}
    >
      <span className="sr-only">{t("loading")}</span>
      <div className="flex flex-col gap-2">
        <SkeletonBar className="h-6 w-48" />
        <SkeletonBar className="w-72 max-w-full" />
      </div>
      <div className="flex flex-col">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="flex h-12 items-center gap-4 border-b border-rule last:border-b-0"
          >
            <SkeletonBar className="w-1/3" />
            <SkeletonBar className="w-1/5" />
            <SkeletonBar className="ms-auto w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
