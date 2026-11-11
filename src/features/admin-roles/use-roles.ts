"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, unwrap, unwrapPage } from "@/lib/api/client";
import { type ListParams, queryKeys, staleTimes } from "@/lib/api/query-keys";
import type { Role } from "@/lib/api/types";

// Data for the roles list, create and delete, and the role editor (FE-43,
// FE-44, FE-45; TRD 8.4, 8.5).

/** The filters the roles list keeps in the URL (APP_FLOW 7). */
export const ROLE_FILTERS = ["search"] as const;

/** Identity's limits for a role (BE TRD 9.6). */
export const ROLE_NAME_MAX = 50;
export const ROLE_DESCRIPTION_MAX = 200;

/** One page of the tenant's roles, with user and permission counts. */
export function useRoles(params: ListParams) {
  const search = params.filters.search;
  return useQuery({
    queryKey: queryKeys.admin.roles.list(params),
    queryFn: () =>
      unwrapPage(
        api.GET("/admin/roles", {
          params: {
            query: {
              page: params.page,
              size: params.size,
              ...(search ? { search } : {}),
            },
          },
        }),
      ),
    staleTime: staleTimes.adminRoles,
    placeholderData: keepPreviousData,
  });
}

/**
 * Role changes move the users' role names and the counts, so both the roles
 * and the users queries are refetched.
 */
function useInvalidateRoles() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.roles.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all }),
    ]);
}

export type CreateRoleValues = {
  name: string;
  description?: string;
  permissions?: string[];
};

/** `POST /v1/admin/roles`, with the keys the role grants from the start. */
export function useCreateRole() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: (values: CreateRoleValues) =>
      unwrap(api.POST("/admin/roles", { body: values })),
    onSuccess: () => invalidate(),
  });
}

/**
 * `DELETE /v1/admin/roles/{id}`. Identity refuses an assigned role with
 * ROLE_IN_USE unless `force` is set, which removes the assignments too.
 */
export function useDeleteRole() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) =>
      unwrap(
        api.DELETE("/admin/roles/{id}", {
          params: { path: { id }, query: force ? { force: true } : {} },
        }),
      ),
    onSuccess: () => invalidate(),
  });
}

/** `GET /v1/admin/roles/{id}`: the role with its keys and version. */
export function useRole(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.roles.detail(id ?? ""),
    queryFn: () =>
      unwrap(
        api.GET("/admin/roles/{id}", { params: { path: { id: id ?? "" } } }),
      ),
    staleTime: staleTimes.adminRoles,
    enabled: id !== undefined,
  });
}

/** `GET /v1/admin/permissions`: every key a role can grant. */
export function usePermissionCatalog() {
  return useQuery({
    queryKey: queryKeys.admin.permissions,
    queryFn: () => unwrap(api.GET("/admin/permissions")),
    staleTime: staleTimes.adminPermissions,
  });
}

/** The `If-Match` value for a version (TRD 8.5). */
export function ifMatch(version: number): string {
  return `"${String(version)}"`;
}

export type RoleEdits = {
  id: string;
  version: number;
  /** Set only when the name or description changed. */
  fields?: { name: string; description: string };
  /** Set only when the keys changed: the full list. */
  permissions?: string[];
};

/**
 * Saves a role: `PATCH` for the name and description, then
 * `PUT …/permissions` for the keys, each with `If-Match` at the version the
 * step before returned. `onStep` hears each saved step, so a failure in the
 * second keeps what the first saved.
 */
export function useSaveRole() {
  const invalidate = useInvalidateRoles();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      edits,
      onStep,
    }: {
      edits: RoleEdits;
      onStep: (role: Role) => void;
    }) => {
      let version = edits.version;
      let saved: Role | undefined;
      if (edits.fields) {
        saved = await unwrap(
          api.PATCH("/admin/roles/{id}", {
            params: {
              path: { id: edits.id },
              header: { "If-Match": ifMatch(version) },
            },
            body: edits.fields,
          }),
        );
        version = saved.version;
        onStep(saved);
      }
      if (edits.permissions) {
        saved = await unwrap(
          api.PUT("/admin/roles/{id}/permissions", {
            params: {
              path: { id: edits.id },
              header: { "If-Match": ifMatch(version) },
            },
            body: { permissions: edits.permissions },
          }),
        );
        onStep(saved);
      }
      return saved;
    },
    onSuccess: (role) => {
      if (role) {
        queryClient.setQueryData(queryKeys.admin.roles.detail(role.id), role);
      }
      return invalidate();
    },
  });
}
