import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { requireSuperAdmin } from "@/lib/session/require-permission";
import { RoleEditor } from "@/features/admin-roles/role-editor";

/** The id segment that opens the editor empty, to create a template. */
const NEW = "new";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const [{ id }, t] = await Promise.all([
    params,
    getTranslations("adminRoles.templateEditor"),
  ]);
  return {
    title: `${id === NEW ? t("newTitle") : t("title")} · ${brand.appName}`,
  };
}

// /admin/role-templates/{id} and /admin/role-templates/new (FE-52;
// DESIGN_BRIEF 7.10): the role editor for a template. Super admin only, and
// only in multi mode.
export default async function RoleTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }] = await Promise.all([params, requireSuperAdmin()]);
  return id === NEW ? (
    <RoleEditor kind="template" />
  ) : (
    <RoleEditor kind="template" id={decodeURIComponent(id)} />
  );
}
