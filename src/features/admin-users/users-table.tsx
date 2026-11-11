"use client";

import { SearchX, Users } from "lucide-react";
import Link from "next/link";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useCan } from "@/components/auth/can";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/data-table";
import { useListParams } from "@/components/data-table/use-list-params";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import type { AdminUser } from "@/lib/api/types";
import { ROLES_MANAGE } from "@/lib/authz/permissions";
import { UserFilters } from "@/features/admin-users/user-filters";
import { Pill, UserStatusPill } from "@/features/admin-users/user-status";
import {
  USER_FILTERS,
  useRoleOptions,
  useUsers,
} from "@/features/admin-users/use-users";

// The users list (FE-40, APP_FLOW 7, DESIGN_BRIEF 7.7): filters, sort and page
// in the URL, a table from 640px and cards below. A name opens the user.

const LIST_CONFIG = { filters: USER_FILTERS, searchKey: "search" } as const;
/** Role pills shown before "+N". */
const VISIBLE_ROLES = 2;
const NOW_REFRESH_MS = 60_000;

export function userPath(user: Pick<AdminUser, "id">): string {
  return `/admin/users/${encodeURIComponent(user.id)}`;
}

function RolePills({ roles }: { roles: AdminUser["roles"] }) {
  const t = useTranslations("adminUsers.table");
  if (roles.length === 0) {
    return <span className="text-muted-foreground">{t("noRoles")}</span>;
  }
  const shown = roles.slice(0, VISIBLE_ROLES);
  const more = roles.length - shown.length;
  return (
    <span className="flex flex-wrap items-center gap-1">
      {shown.map((role) => (
        <Pill key={role.id} tone="neutral">
          {role.name}
        </Pill>
      ))}
      {more > 0 && (
        <span
          className="text-small text-muted-foreground"
          title={roles
            .slice(VISIBLE_ROLES)
            .map((role) => role.name)
            .join(", ")}
        >
          {t("moreRoles", { count: more })}
        </span>
      )}
    </span>
  );
}

export function UsersTable() {
  const t = useTranslations("adminUsers.table");
  const format = useFormatter();
  const now = useNow({ updateInterval: NOW_REFRESH_MS });
  const list = useListParams(LIST_CONFIG);
  const users = useUsers(list.params);
  const canListRoles = useCan(ROLES_MANAGE);
  const roles = useRoleOptions(canListRoles);

  const lastSignIn = (user: AdminUser) =>
    user.last_sign_in_at
      ? format.relativeTime(new Date(user.last_sign_in_at), now)
      : t("never");

  const columns: DataTableColumn<AdminUser>[] = [
    {
      id: "name",
      header: t("name"),
      sortField: "display_name",
      identity: true,
      cell: (user) => (
        <div className="flex min-w-0 flex-col py-1.5">
          <Link
            href={userPath(user)}
            className="font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {user.display_name || t("unnamed")}
          </Link>
          <span className="truncate text-small text-muted-foreground">
            {user.email}
          </span>
        </div>
      ),
    },
    {
      id: "roles",
      header: t("roles"),
      cell: (user) => <RolePills roles={user.roles} />,
    },
    {
      id: "status",
      header: t("status"),
      cell: (user) => <UserStatusPill user={user} />,
    },
    {
      id: "lastSignIn",
      header: t("lastSignIn"),
      cell: (user) => (
        <span className="text-muted-foreground">{lastSignIn(user)}</span>
      ),
    },
    {
      id: "added",
      header: t("added"),
      sortField: "created_at",
      align: "end",
      cell: (user) =>
        format.dateTime(new Date(user.created_at), { dateStyle: "medium" }),
    },
  ];

  const total = users.data?.total;

  return (
    <div className="flex flex-col gap-4">
      <p aria-live="polite" className="min-h-5 text-body text-muted-foreground">
        {total !== undefined && t("total", { count: total })}
      </p>
      <UserFilters
        filters={list.params.filters}
        search={list.search.value}
        onSearchChange={list.search.onChange}
        onFilterChange={(key, value) => {
          list.setFilter(key, value);
        }}
        onClear={list.clearFilters}
        hasFilters={list.hasFilters}
        roles={canListRoles ? roles.data?.items : undefined}
      />
      <DataTable
        columns={columns}
        query={users}
        getRowId={(user) => user.id}
        caption={t("caption")}
        errorTitle={t("loadFailed")}
        sort={list.params.sort}
        onSortChange={list.setSort}
        onPageChange={list.setPage}
        onSizeChange={list.setSize}
        mobileCard={(user) => ({
          title: (
            <Link href={userPath(user)} className="hover:underline">
              {user.display_name || t("unnamed")}
            </Link>
          ),
          value: <UserStatusPill user={user} />,
          meta: [
            user.email,
            user.roles.map((role) => role.name).join(", ") || t("noRoles"),
            t("lastSignInShort", { when: lastSignIn(user) }),
          ],
        })}
        empty={
          list.hasFilters ? (
            <EmptyState
              icon={SearchX}
              title={t("noMatch")}
              description={t("noMatchBody")}
              action={
                <Button variant="outline" onClick={list.clearFilters}>
                  {t("clearFilters")}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Users}
              title={t("empty")}
              description={t("emptyBody")}
            />
          )
        }
      />
    </div>
  );
}
