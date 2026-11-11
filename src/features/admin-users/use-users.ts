"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, unwrap, unwrapPage } from "@/lib/api/client";
import { type ListParams, queryKeys, staleTimes } from "@/lib/api/query-keys";
import type { AdminUser } from "@/lib/api/types";

// Data for the users list and the invite dialog (FE-40, FE-41; TRD 8.4).

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
