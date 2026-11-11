import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { env } from "@/config/env";
import { requireSuperAdmin } from "@/lib/session/require-permission";
import { TenantDetail } from "@/features/tenants/tenant-detail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tenants.detail");
  return { title: `${t("title")} · ${brand.appName}` };
}

// /admin/tenants/{id} (FE-51; APP_FLOW 5.15; DESIGN_BRIEF 7.10). Super admin
// only, and only in multi mode.
export default async function TenantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }] = await Promise.all([params, requireSuperAdmin()]);
  return (
    <TenantDetail
      id={decodeURIComponent(id)}
      defaultSlug={env.DEFAULT_TENANT_SLUG}
    />
  );
}
