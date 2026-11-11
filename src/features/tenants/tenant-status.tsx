"use client";

import { useTranslations } from "next-intl";
import type { Tenant } from "@/lib/api/types";
import { cn } from "@/lib/utils";

// A tenant's status mark (DESIGN_BRIEF 6.2): live is positive, suspended is
// negative.

export function TenantStatusPill({
  status,
  className,
}: {
  status: Tenant["status"];
  className?: string;
}) {
  const t = useTranslations("tenants.status");
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center rounded-sm px-2 text-small font-medium whitespace-nowrap",
        status === "active"
          ? "bg-pill-positive text-pill-positive-ink"
          : "bg-pill-negative text-pill-negative-ink",
        className,
      )}
    >
      {t(status)}
    </span>
  );
}
