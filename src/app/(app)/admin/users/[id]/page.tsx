import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { USERS_READ } from "@/lib/authz/permissions";
import { requirePermission } from "@/lib/session/require-permission";
import { UserDetail } from "@/features/admin-users/user-detail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminUsers.detail");
  return { title: `${t("title")} · ${brand.appName}` };
}

// /admin/users/{id} (FE-42, FE-47; APP_FLOW 5.12; DESIGN_BRIEF 7.7). Reading
// needs users:read; every change needs users:manage.
export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }] = await Promise.all([params, requirePermission(USERS_READ)]);
  return <UserDetail id={decodeURIComponent(id)} />;
}
