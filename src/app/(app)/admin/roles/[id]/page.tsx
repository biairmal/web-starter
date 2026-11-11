import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { ROLES_MANAGE } from "@/lib/authz/permissions";
import { requirePermission } from "@/lib/session/require-permission";
import { RoleEditor } from "@/features/admin-roles/role-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminRoles.editor");
  return { title: `${t("title")} · ${brand.appName}` };
}

// /admin/roles/{id} (FE-44, FE-45, FE-47; APP_FLOW 5.13; DESIGN_BRIEF 7.8).
export default async function RolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }] = await Promise.all([params, requirePermission(ROLES_MANAGE)]);
  return <RoleEditor id={decodeURIComponent(id)} />;
}
