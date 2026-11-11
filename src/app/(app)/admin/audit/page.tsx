import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { AUDIT_READ } from "@/lib/authz/permissions";
import { requirePermission } from "@/lib/session/require-permission";
import { AuditTable } from "@/features/audit/audit-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("audit");
  return { title: `${t("title")} · ${brand.appName}` };
}

// /admin/audit (FE-46; APP_FLOW 7; DESIGN_BRIEF 7.9). Needs audit:read.
export default async function AuditPage() {
  await requirePermission(AUDIT_READ);
  const t = await getTranslations("audit");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-title font-semibold">{t("title")}</h1>
        <p className="text-body text-muted-foreground">{t("body")}</p>
      </div>
      <AuditTable />
    </div>
  );
}
