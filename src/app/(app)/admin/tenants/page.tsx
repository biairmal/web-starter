import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { requireSuperAdmin } from "@/lib/session/require-permission";
import { CreateTenantDialog } from "@/features/tenants/create-tenant-dialog";
import { TenantsTable } from "@/features/tenants/tenants-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tenants");
  return { title: `${t("title")} · ${brand.appName}` };
}

// /admin/tenants (FE-50; APP_FLOW 5.15; DESIGN_BRIEF 7.10). Super admin only,
// and only in multi mode: 404 in single mode, 403 for anyone else.
export default async function TenantsPage() {
  await requireSuperAdmin();
  const t = await getTranslations("tenants");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-title font-semibold">{t("title")}</h1>
          <p className="text-body text-muted-foreground">{t("body")}</p>
        </div>
        <CreateTenantDialog />
      </div>
      <TenantsTable />
    </div>
  );
}
