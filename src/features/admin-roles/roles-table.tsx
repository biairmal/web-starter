"use client";

import { MoreHorizontal, SearchX, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useId, useState } from "react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/data-table";
import { useListParams } from "@/components/data-table/use-list-params";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { RoleSummary } from "@/lib/api/types";
import { DeleteRoleDialog } from "@/features/admin-roles/delete-role-dialog";
import { ROLE_FILTERS, useRoles } from "@/features/admin-roles/use-roles";

// The roles list (FE-43, APP_FLOW 7, DESIGN_BRIEF 7.8): "What can each role
// do, and is one unused?" Name with a System chip, description, user and
// permission counts (0 printed), and a menu with Edit and Delete.

const LIST_CONFIG = { filters: ROLE_FILTERS, searchKey: "search" } as const;

export function rolePath(role: Pick<RoleSummary, "id">): string {
  return `/admin/roles/${encodeURIComponent(role.id)}`;
}

function SystemChip() {
  const t = useTranslations("adminRoles.table");
  return (
    <span className="inline-flex h-5 items-center rounded-sm bg-pill-neutral px-2 text-small font-medium text-pill-neutral-ink">
      {t("system")}
    </span>
  );
}

function RowMenu({
  role,
  onDelete,
}: {
  role: RoleSummary;
  onDelete: (role: RoleSummary) => void;
}) {
  const t = useTranslations("adminRoles.table");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("actions", { name: role.name })}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={rolePath(role)}>
            {role.is_system ? t("view") : t("edit")}
          </Link>
        </DropdownMenuItem>
        {!role.is_system && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                onDelete(role);
              }}
            >
              {t("delete")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RolesTable() {
  const t = useTranslations("adminRoles.table");
  const format = useFormatter();
  const searchId = useId();
  const list = useListParams(LIST_CONFIG);
  const roles = useRoles(list.params);
  const [deleting, setDeleting] = useState<RoleSummary | undefined>();

  const columns: DataTableColumn<RoleSummary>[] = [
    {
      id: "name",
      header: t("name"),
      identity: true,
      cell: (role) => (
        <span className="flex flex-wrap items-center gap-2 py-1.5">
          <Link
            href={rolePath(role)}
            className="font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {role.name}
          </Link>
          {role.is_system && <SystemChip />}
        </span>
      ),
    },
    {
      id: "description",
      header: t("description"),
      cell: (role) => (
        <span className="line-clamp-2 text-muted-foreground">
          {role.description}
        </span>
      ),
    },
    {
      id: "users",
      header: t("users"),
      align: "end",
      cell: (role) => format.number(role.user_count),
    },
    {
      id: "permissions",
      header: t("permissions"),
      align: "end",
      cell: (role) => format.number(role.permission_count),
    },
    {
      id: "menu",
      header: <span className="sr-only">{t("actionsHeader")}</span>,
      align: "end",
      cell: (role) => <RowMenu role={role} onDelete={setDeleting} />,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full sm:w-72">
        <label htmlFor={searchId} className="sr-only">
          {t("search")}
        </label>
        <Input
          id={searchId}
          type="search"
          value={list.search.value}
          placeholder={t("search")}
          autoComplete="off"
          onChange={(event) => {
            list.search.onChange(event.target.value);
          }}
        />
      </div>
      <DataTable
        columns={columns}
        query={roles}
        getRowId={(role) => role.id}
        caption={t("caption")}
        errorTitle={t("loadFailed")}
        onPageChange={list.setPage}
        onSizeChange={list.setSize}
        mobileCard={(role) => ({
          title: (
            <span className="flex items-center gap-2">
              <Link href={rolePath(role)} className="hover:underline">
                {role.name}
              </Link>
              {role.is_system && <SystemChip />}
            </span>
          ),
          meta: [
            t("usersCount", { count: role.user_count }),
            t("permissionsCount", { count: role.permission_count }),
            role.description,
          ],
          action: <RowMenu role={role} onDelete={setDeleting} />,
        })}
        empty={
          list.hasFilters ? (
            <EmptyState
              icon={SearchX}
              title={t("noMatch")}
              action={
                <Button variant="outline" onClick={list.clearFilters}>
                  {t("clearSearch")}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={ShieldCheck}
              title={t("empty")}
              description={t("emptyBody")}
            />
          )
        }
      />
      <DeleteRoleDialog
        role={deleting}
        onClose={() => {
          setDeleting(undefined);
        }}
      />
    </div>
  );
}
