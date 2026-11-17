"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { Tenant } from "@/lib/api/types";

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
    <Badge
      variant={status === "active" ? "positive" : "negative"}
      className={className}
    >
      {t(status)}
    </Badge>
  );
}
