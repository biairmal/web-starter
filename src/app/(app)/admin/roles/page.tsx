import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { ROLES_MANAGE } from "@/lib/authz/permissions";
import { requirePermission } from "@/lib/session/require-permission";
import { CreateRoleDialog } from "@/features/admin-roles/create-role-dialog";
import { RolesTable } from "@/features/admin-roles/roles-table";
import { PageHeader } from "@/components/layout/page-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminRoles");
  return { title: `${t("title")} · ${brand.appName}` };
}

// /admin/roles (FE-43; APP_FLOW 5.14, 7; DESIGN_BRIEF 7.8). Every roles
// endpoint needs roles:manage.
export default async function RolesPage() {
  await requirePermission(ROLES_MANAGE);
  const t = await getTranslations("adminRoles");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("body")}
        action={<CreateRoleDialog />}
      />
      <RolesTable />
    </div>
  );
}
