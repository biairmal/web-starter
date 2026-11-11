"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, unwrap, unwrapPage } from "@/lib/api/client";
import { type ListParams, queryKeys, staleTimes } from "@/lib/api/query-keys";

// Data for the roles list, create and delete (FE-43; TRD 8.4).

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

export type CreateRoleValues = { name: string; description?: string };

/** `POST /v1/admin/roles`: a role with no permissions yet. */
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
