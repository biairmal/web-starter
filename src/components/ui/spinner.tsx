"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// A spinner for a part of the page that is waiting (a search, a panel). By
// default it is a status that says "Loading"; pass `label` to say what loads.
// Inside a control that already says it is busy (SubmitButton, a search field
// with aria-busy), pass `decorative` so it is not announced twice. Whole pages
// use skeletons instead (feedback/page-skeleton.tsx).
function Spinner({
  label,
  decorative = false,
  className,
}: {
  label?: string;
  decorative?: boolean;
  className?: string;
}) {
  const t = useTranslations("feedback");
  const icon = (
    <Loader2
      aria-hidden="true"
      className={cn(
        "size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none",
        className,
      )}
    />
  );
  if (decorative) {
    return icon;
  }
  return (
    <span role="status" data-slot="spinner" className="inline-flex">
      {icon}
      <span className="sr-only">{label ?? t("loading")}</span>
    </span>
  );
}

export { Spinner };
