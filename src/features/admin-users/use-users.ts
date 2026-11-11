"use client";

import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, unwrap, unwrapPage } from "@/lib/api/client";
import { type ListParams, queryKeys, staleTimes } from "@/lib/api/query-keys";
import type { AdminUser } from "@/lib/api/types";

// Data for the users list, the invite dialog and the user detail page
// (FE-40, FE-41, FE-42; TRD 8.4).

/** The filters the users list keeps in the URL (APP_FLOW 7). */
export const USER_FILTERS = [
  "search",
  "status",
  "membership_status",
  "role",
] as const;

export const ACCOUNT_STATUSES = ["pending", "active", "disabled"] as const;
export const MEMBERSHIP_STATUSES = ["invited", "active", "disabled"] as const;
export const USER_SORTS = [
  "display_name,ASC",
  "display_name,DESC",
  "created_at,ASC",
  "created_at,DESC",
] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];
export type MembershipStatus = AdminUser["membership_status"];

/** The roles a picker offers: identity's page size limit. */
export const ROLE_OPTIONS_SIZE = 100;

function oneOf<T extends string>(
  allowed: readonly T[],
  value: string | undefined,
): T | undefined {
  return allowed.find((entry) => entry === value);
}

/**
 * The query for `GET /v1/admin/users`. A value the API would refuse (an
 * edited URL) is left out, so the list still loads.
 */
export function usersQuery(params: ListParams) {
  const sort = oneOf(USER_SORTS, params.sort);
  const status = oneOf(ACCOUNT_STATUSES, params.filters.status);
  const membership = oneOf(
    MEMBERSHIP_STATUSES,
    params.filters.membership_status,
  );
  const { search, role } = params.filters;
  return {
    page: params.page,
    size: params.size,
    ...(sort ? { sort: [sort] } : {}),
    ...(status ? { status } : {}),
    ...(membership ? { membership_status: membership } : {}),
    ...(role ? { role } : {}),
    ...(search ? { search } : {}),
  };
}

/** One page of the tenant's users. The previous page stays while the next loads. */
export function useUsers(params: ListParams) {
  return useQuery({
    queryKey: queryKeys.admin.users.list(params),
    queryFn: () =>
      unwrapPage(
        api.GET("/admin/users", { params: { query: usersQuery(params) } }),
      ),
    staleTime: staleTimes.adminUsers,
    placeholderData: keepPreviousData,
  });
}

/**
 * The tenant's roles, for the role filter and the invite dialog. Identity
 * lists roles only to holders of `roles:manage`, so callers pass `enabled`.
 */
export function useRoleOptions(enabled = true) {
  const params: ListParams = { page: 1, size: ROLE_OPTIONS_SIZE, filters: {} };
  return useQuery({
    queryKey: queryKeys.admin.roles.list(params),
    queryFn: () =>
      unwrapPage(
        api.GET("/admin/roles", {
          params: { query: { page: 1, size: ROLE_OPTIONS_SIZE } },
        }),
      ),
    staleTime: staleTimes.adminRoles,
    enabled,
  });
}

export type InviteValues = {
  email: string;
  display_name?: string;
  role_ids: string[];
};

/** `POST /v1/admin/users/invite`. Sending it again re-sends the email. */
export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: InviteValues) =>
      unwrap(api.POST("/admin/users/invite", { body: values })),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all }),
  });
}

/** `GET /v1/admin/users/{id}`. */
export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.admin.users.detail(id),
    queryFn: () =>
      unwrap(api.GET("/admin/users/{id}", { params: { path: { id } } })),
    staleTime: staleTimes.adminUsers,
  });
}

/**
 * The permissions of each role, for disabling the roles an admin may not
 * assign (identity refuses them with PERMISSION_NOT_HELD). One cached request
 * per role, shared with the role editor.
 */
export function useRolePermissions(ids: readonly string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.admin.roles.detail(id),
      queryFn: () =>
        unwrap(api.GET("/admin/roles/{id}", { params: { path: { id } } })),
      staleTime: staleTimes.adminRoles,
    })),
    combine: (results) => {
      const byRole = new Map<string, readonly string[]>();
      results.forEach((result, index) => {
        const id = ids[index];
        if (id !== undefined && result.data) {
          byRole.set(id, result.data.permissions);
        }
      });
      return byRole;
    },
  });
}

/**
 * After a change to a user: the lists and the detail. Role counts change with
 * a role assignment or a removal, so the roles too. A removed user's detail
 * is left alone: it would only answer 404 while the page navigates away.
 */
function useInvalidateUser(id: string) {
  const queryClient = useQueryClient();
  return (options: { roles?: boolean; removed?: boolean } = {}) =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.users.all,
        ...(options.removed
          ? { predicate: (query) => query.queryKey[2] !== id }
          : {}),
      }),
      ...(options.roles
        ? [
            queryClient.invalidateQueries({
              queryKey: queryKeys.admin.roles.all,
            }),
          ]
        : []),
    ]);
}

/** `PUT /v1/admin/users/{id}/roles`: the full list, without If-Match (TRD 8.5). */
export function useSetUserRoles(id: string) {
  const invalidate = useInvalidateUser(id);
  return useMutation({
    mutationFn: (roleIds: string[]) =>
      unwrap(
        api.PUT("/admin/users/{id}/roles", {
          params: { path: { id } },
          body: { role_ids: roleIds },
        }),
      ),
    onSuccess: () => invalidate({ roles: true }),
  });
}

export type UserAction = "disable" | "enable" | "revokeSessions" | "remove";

function runAction(action: UserAction, id: string) {
  const options = { params: { path: { id } } };
  switch (action) {
    case "disable":
      return unwrap(api.POST("/admin/users/{id}/disable", options));
    case "enable":
      return unwrap(api.POST("/admin/users/{id}/enable", options));
    case "revokeSessions":
      return unwrap(api.POST("/admin/users/{id}/revoke-sessions", options));
    case "remove":
      return unwrap(api.DELETE("/admin/users/{id}", options));
  }
}

/** Disable, enable, revoke sessions or remove from the tenant. */
export function useUserAction(id: string) {
  const invalidate = useInvalidateUser(id);
  return useMutation({
    mutationFn: (action: UserAction) => runAction(action, id),
    onSuccess: (_data, action) =>
      action === "revokeSessions"
        ? undefined
        : invalidate(action === "remove" ? { roles: true, removed: true } : {}),
  });
}
