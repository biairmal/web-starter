"use client";

import { LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo } from "react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/data-table";
import { EmptyState } from "@/components/feedback/empty-state";
import type { Page, RoleTemplate } from "@/lib/api/types";
import {
  roleTemplatePath,
  useRoleTemplates,
} from "@/features/admin-roles/use-role-templates";

// The role templates list (FE-52; DESIGN_BRIEF 7.10): the roles every new
// tenant starts with. Identity returns them all at once, so the table shows
// one page. A name opens the template in the role editor.

function asPage(items: RoleTemplate[]): Page<RoleTemplate> {
  return {
    items,
    total: items.length,
    page: 1,
    size: Math.max(items.length, 1),
    total_pages: 1,
    has_prev: false,
    has_next: false,
  };
}

function SystemChip() {
  const t = useTranslations("adminRoles.table");
  return (
    <span className="inline-flex h-5 items-center rounded-sm bg-pill-neutral px-2 text-small font-medium text-pill-neutral-ink">
      {t("system")}
    </span>
  );
}

export function RoleTemplatesTable() {
  const t = useTranslations("adminRoles.templates");
  const format = useFormatter();
  const templates = useRoleTemplates();
  const page = useMemo(
    () => (templates.data ? asPage(templates.data) : undefined),
    [templates.data],
  );

  const columns: DataTableColumn<RoleTemplate>[] = [
    {
      id: "name",
      header: t("name"),
      identity: true,
      cell: (template) => (
        <span className="flex items-center gap-2 py-1.5">
          <Link
            href={roleTemplatePath(template)}
            className="font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {template.name}
          </Link>
          {template.is_system && <SystemChip />}
        </span>
      ),
    },
    {
      id: "description",
      header: t("description"),
      cell: (template) => (
        <span className="text-muted-foreground">{template.description}</span>
      ),
    },
    {
      id: "permissions",
      header: t("permissions"),
      align: "end",
      cell: (template) => format.number(template.permissions.length),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <p aria-live="polite" className="min-h-5 text-body text-muted-foreground">
        {page && t("total", { count: page.total })}
      </p>
      <DataTable
        columns={columns}
        query={{
          data: page,
          isPending: templates.isPending,
          isError: templates.isError,
          error: templates.error,
          isRefetching: templates.isRefetching,
          refetch: templates.refetch,
        }}
        getRowId={(template) => template.id}
        caption={t("caption")}
        errorTitle={t("loadFailed")}
        onPageChange={() => undefined}
        onSizeChange={() => undefined}
        mobileCard={(template) => ({
          title: (
            <Link href={roleTemplatePath(template)} className="hover:underline">
              {template.name}
            </Link>
          ),
          value: template.is_system ? <SystemChip /> : undefined,
          meta: [
            t("permissionsCount", { count: template.permissions.length }),
            template.description,
          ],
        })}
        empty={
          <EmptyState
            icon={LayoutTemplate}
            title={t("empty")}
            description={t("emptyBody")}
          />
        }
      />
    </div>
  );
}
