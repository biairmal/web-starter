import type * as React from "react";
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

function LoadingStatus({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("feedback");
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{t("loading")}</span>
      {children}
    </div>
  );
}

/** A grid of cards loading, for a dashboard or a card list. */
export function CardGridSkeleton({
  cards = 6,
  className,
}: {
  cards?: number;
  className?: string;
}) {
  return (
    <LoadingStatus
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {Array.from({ length: cards }, (_, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-lg border border-border p-card-pad"
        >
          <SkeletonBar className="w-1/3" />
          <SkeletonBar className="h-6 w-1/2" />
          <SkeletonBar className="w-3/4" />
        </div>
      ))}
    </LoadingStatus>
  );
}

/** One record loading: its title row, then label and value pairs. */
export function DetailSkeleton({
  fields = 5,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <LoadingStatus className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-2">
        <SkeletonBar className="w-32" />
        <SkeletonBar className="h-6 w-56 max-w-full" />
      </div>
      <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-3">
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className="contents">
            <SkeletonBar className="w-24" />
            <SkeletonBar className="w-2/3 sm:col-span-2" />
          </div>
        ))}
      </dl>
    </LoadingStatus>
  );
}

/** A form loading: labels over fields at their real height. */
export function FormSkeleton({
  fields = 4,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <LoadingStatus className={cn("flex max-w-xl flex-col gap-5", className)}>
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <SkeletonBar className="w-24" />
          <SkeletonBar className="h-9 w-full rounded-md" />
        </div>
      ))}
      <SkeletonBar className="h-9 w-24 rounded-md" />
    </LoadingStatus>
  );
}
