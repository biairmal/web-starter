import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { AUDIT_READ } from "@/lib/authz/permissions";
import { requirePermission } from "@/lib/session/require-permission";
import { AuditTable } from "@/features/audit/audit-table";
import { PageHeader } from "@/components/layout/page-header";

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
      <PageHeader title={t("title")} description={t("body")} />
      <AuditTable />
    </div>
  );
}
