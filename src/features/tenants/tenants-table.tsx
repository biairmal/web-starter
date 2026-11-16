"use client";

import { Building2, SearchX } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/data-table";
import { useListParams } from "@/components/data-table/use-list-params";
import { EmptyState } from "@/components/feedback/empty-state";
import { FilterBar } from "@/components/filters/filter-bar";
import { FilterTabs } from "@/components/filters/filter-tabs";
import { Button } from "@/components/ui/button";
import type { Tenant } from "@/lib/api/types";
import { TenantStatusPill } from "@/features/tenants/tenant-status";
import {
  TENANT_FILTERS,
  TENANT_STATUSES,
  tenantPath,
  useTenants,
} from "@/features/tenants/use-tenants";

// The tenants list (FE-50, DESIGN_BRIEF 7.10): "Which tenants are live, and
// is one in trouble?" Status tabs and a search, both in the URL; a table from
// 640px and cards below. A name opens the tenant.

const LIST_CONFIG = { filters: TENANT_FILTERS, searchKey: "search" } as const;

function TenantName({ tenant }: { tenant: Tenant }) {
  return (
    <div className="flex min-w-0 flex-col py-1.5">
      <Link
        href={tenantPath(tenant)}
        className="font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {tenant.name}
      </Link>
      <span className="truncate font-mono text-small text-muted-foreground">
        {tenant.slug}
      </span>
    </div>
  );
}

export function TenantsTable() {
  const t = useTranslations("tenants.table");
  const tFilters = useTranslations("tenants.filters");
  const format = useFormatter();
  const list = useListParams(LIST_CONFIG);
  const tenants = useTenants(list.params);
  const status = list.params.filters.status ?? "";

  const members = (tenant: Tenant) =>
    tenant.member_count === undefined
      ? "–"
      : format.number(tenant.member_count);

  const columns: DataTableColumn<Tenant>[] = [
    {
      id: "name",
      header: t("name"),
      identity: true,
      cell: (tenant) => <TenantName tenant={tenant} />,
    },
    {
      id: "status",
      header: t("status"),
      cell: (tenant) => <TenantStatusPill status={tenant.status} />,
    },
    {
      id: "members",
      header: t("members"),
      align: "end",
      cell: members,
    },
    {
      id: "created",
      header: t("created"),
      align: "end",
      cell: (tenant) =>
        format.dateTime(new Date(tenant.created_at), { dateStyle: "medium" }),
    },
  ];

  const total = tenants.data?.total;

  return (
    <div className="flex flex-col gap-4">
      <p aria-live="polite" className="min-h-5 text-body text-muted-foreground">
        {total !== undefined && t("total", { count: total })}
      </p>
      <FilterTabs
        label={tFilters("status")}
        value={status}
        options={(["", ...TENANT_STATUSES] as const).map((value) => ({
          value,
          label: tFilters(`tabs.${value || "all"}`),
        }))}
        onChange={(value) => {
          list.setFilter("status", value);
        }}
      />
      <FilterBar
        search={{
          value: list.search.value,
          onChange: list.search.onChange,
          label: tFilters("search"),
        }}
        filters={[]}
        values={list.params.filters}
        onChange={(key, value) => {
          list.setFilter(key, value);
        }}
        onClear={list.clearFilters}
      />
      <DataTable
        columns={columns}
        query={tenants}
        getRowId={(tenant) => tenant.id}
        caption={t("caption")}
        errorTitle={t("loadFailed")}
        onPageChange={list.setPage}
        onSizeChange={list.setSize}
        mobileCard={(tenant) => ({
          title: (
            <Link href={tenantPath(tenant)} className="hover:underline">
              {tenant.name}
            </Link>
          ),
          value: <TenantStatusPill status={tenant.status} />,
          meta: [tenant.slug, t("membersShort", { members: members(tenant) })],
        })}
        empty={
          list.hasFilters ? (
            <EmptyState
              icon={SearchX}
              title={t("noMatch")}
              description={t("noMatchBody")}
              action={
                <Button variant="outline" onClick={list.clearFilters}>
                  {tFilters("clear")}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Building2}
              title={t("empty")}
              description={t("emptyBody")}
            />
          )
        }
      />
    </div>
  );
}
