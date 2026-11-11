import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { requireSuperAdmin } from "@/lib/session/require-permission";
import { TemplateNotice } from "@/features/admin-roles/role-editor";
import { RoleTemplatesTable } from "@/features/admin-roles/role-templates-table";

/** A server page cannot read constants from client modules, so the path is here. */
const NEW_TEMPLATE_PATH = "/admin/role-templates/new";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminRoles.templates");
  return { title: `${t("title")} · ${brand.appName}` };
}

// /admin/role-templates (FE-52; DESIGN_BRIEF 7.10). Super admin only, and
// only in multi mode: 404 in single mode, 403 for anyone else.
export default async function RoleTemplatesPage() {
  await requireSuperAdmin();
  const t = await getTranslations("adminRoles.templates");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-title font-semibold">{t("title")}</h1>
          <p className="text-body text-muted-foreground">{t("body")}</p>
        </div>
        <Button asChild>
          <Link href={NEW_TEMPLATE_PATH}>
            <Plus aria-hidden="true" />
            {t("new")}
          </Link>
        </Button>
      </div>
      <TemplateNotice />
      <RoleTemplatesTable />
    </div>
  );
}
