import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";
import { can } from "@/lib/authz/can";
import { USERS_MANAGE, USERS_READ } from "@/lib/authz/permissions";
import { requirePermission } from "@/lib/session/require-permission";
import { InviteDialog } from "@/features/admin-users/invite-dialog";
import { UsersTable } from "@/features/admin-users/users-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminUsers");
  return { title: `${t("title")} · ${brand.appName}` };
}

// /admin/users (FE-40, FE-41; APP_FLOW 5.11, 7; DESIGN_BRIEF 7.7). Reading
// needs users:read; inviting needs users:manage.
export default async function UsersPage() {
  const me = await requirePermission(USERS_READ);
  const t = await getTranslations("adminUsers");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-title font-semibold">{t("title")}</h1>
          <p className="text-body text-muted-foreground">{t("body")}</p>
        </div>
        {can(me, USERS_MANAGE) && <InviteDialog />}
      </div>
      <UsersTable />
    </div>
  );
}
