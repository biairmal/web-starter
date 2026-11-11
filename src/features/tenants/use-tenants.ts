"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, unwrap, unwrapPage } from "@/lib/api/client";
import { type ListParams, queryKeys, staleTimes } from "@/lib/api/query-keys";
import type { Tenant } from "@/lib/api/types";

// Data for the super admin's tenant screens (FE-50, FE-51; BE TRD 9.7;
// TRD 8.4, 8.5).

/** The filters the tenants list keeps in the URL. */
export const TENANT_FILTERS = ["search", "status"] as const;

export const TENANT_STATUSES = ["active", "suspended"] as const;

export type TenantStatus = Tenant["status"];

/** The slug identity accepts for a new tenant (BE TRD 5.2). */
export const NEW_TENANT_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}$/;
export const TENANT_SLUG_MAX = 63;

export const TENANTS_PATH = "/admin/tenants";

export function tenantPath(tenant: Pick<Tenant, "id">): string {
  return `${TENANTS_PATH}/${encodeURIComponent(tenant.id)}`;
}

/**
 * A slug from a tenant name: lowercase ASCII letters and digits, with one
 * hyphen for each run of anything else, trimmed to identity's length.
 */
export function slugFromName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, TENANT_SLUG_MAX)
    .replace(/-+$/, "");
}

function isStatus(value: string | undefined): value is TenantStatus {
  return TENANT_STATUSES.some((status) => status === value);
}

/** The query for `GET /v1/admin/tenants`; a value the API would refuse is left out. */
export function tenantsQuery(params: ListParams) {
  const { search, status } = params.filters;
  return {
    page: params.page,
    size: params.size,
    ...(isStatus(status) ? { status } : {}),
    ...(search ? { search } : {}),
  };
}

/** One page of tenants. The previous page stays while the next loads. */
export function useTenants(params: ListParams) {
  return useQuery({
    queryKey: queryKeys.admin.tenants.list(params),
    queryFn: () =>
      unwrapPage(
        api.GET("/admin/tenants", { params: { query: tenantsQuery(params) } }),
      ),
    staleTime: staleTimes.adminTenants,
    placeholderData: keepPreviousData,
  });
}

/** `GET /v1/admin/tenants/{id}`, with its version for `If-Match`. */
export function useTenant(id: string) {
  return useQuery({
    queryKey: queryKeys.admin.tenants.detail(id),
    queryFn: () =>
      unwrap(api.GET("/admin/tenants/{id}", { params: { path: { id } } })),
    staleTime: staleTimes.adminTenants,
  });
}

export type NewTenant = {
  slug: string;
  name: string;
  first_admin_email: string;
};

/** `POST /v1/admin/tenants`: also copies the role templates and invites the first admin. */
export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: NewTenant) =>
      unwrap(api.POST("/admin/tenants", { body: values })),
    onSuccess: (tenant) => {
      queryClient.setQueryData(
        queryKeys.admin.tenants.detail(tenant.id),
        tenant,
      );
      return queryClient.invalidateQueries({
        queryKey: queryKeys.admin.tenants.all,
        predicate: (query) => query.queryKey[2] !== tenant.id,
      });
    },
  });
}

/** The `If-Match` value for a version (TRD 8.5). */
export function ifMatch(version: number): string {
  return `"${String(version)}"`;
}

export type TenantChange = { name: string } | { status: TenantStatus };

/** `PATCH /v1/admin/tenants/{id}` with `If-Match` at the version shown. */
export function useUpdateTenant(tenant: Pick<Tenant, "id" | "version">) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (change: TenantChange) =>
      unwrap(
        api.PATCH("/admin/tenants/{id}", {
          params: {
            path: { id: tenant.id },
            header: { "If-Match": ifMatch(tenant.version) },
          },
          body: change,
        }),
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        queryKeys.admin.tenants.detail(updated.id),
        updated,
      );
      return queryClient.invalidateQueries({
        queryKey: queryKeys.admin.tenants.all,
        predicate: (query) => query.queryKey[2] !== updated.id,
      });
    },
  });
}
