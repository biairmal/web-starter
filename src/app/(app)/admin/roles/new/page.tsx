import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { ROLES_MANAGE } from "@/lib/authz/permissions";
import { requirePermission } from "@/lib/session/require-permission";
import { RoleEditor } from "@/features/admin-roles/role-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminRoles.editor");
  return { title: `${t("newTitle")} · ${brand.appName}` };
}

// /admin/roles/new: the role editor with an empty matrix (DESIGN_BRIEF 7.8).
export default async function NewRolePage() {
  await requirePermission(ROLES_MANAGE);
  return <RoleEditor />;
}
