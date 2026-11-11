"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, unwrap, unwrapPage } from "@/lib/api/client";
import { type ListParams, queryKeys, staleTimes } from "@/lib/api/query-keys";

// Data for the audit log (FE-46; TRD 8.4): never fresh, refreshed by hand.

/** The filters the audit log keeps in the URL (APP_FLOW 7). */
export const AUDIT_FILTERS = ["actor", "action", "from", "to"] as const;

/**
 * Action prefixes the filter offers, from identity's audit actions. The URL
 * keeps the prefix (`role.`); identity gets it as a LIKE pattern (`role.%`).
 */
export const ACTION_PREFIXES = [
  "auth.",
  "identity.",
  "member.",
  "role.",
  "role_template.",
  "session.",
  "superadmin.",
  "tenant.",
  "user.",
] as const;

export type ActionPrefix = (typeof ACTION_PREFIXES)[number];

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * A `YYYY-MM-DD` from the URL as an RFC 3339 instant in the viewer's time
 * zone: the start of that day, or its last millisecond for the end of a
 * range. Anything else is undefined.
 */
export function dayBoundary(
  value: string | undefined,
  edge: "start" | "end",
): string | undefined {
  const match = value ? DATE.exec(value) : null;
  if (!match) {
    return undefined;
  }
  const [year, month, day] = [match[1], match[2], match[3]].map(Number) as [
    number,
    number,
    number,
  ];
  const date =
    edge === "start"
      ? new Date(year, month - 1, day)
      : new Date(year, month - 1, day, 23, 59, 59, 999);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The query for `GET /v1/admin/audit`; values identity would refuse are left out. */
export function auditQuery(params: ListParams) {
  const { actor, action } = params.filters;
  const prefix = ACTION_PREFIXES.find((entry) => entry === action);
  const from = dayBoundary(params.filters.from, "start");
  const to = dayBoundary(params.filters.to, "end");
  return {
    page: params.page,
    size: params.size,
    ...(actor && UUID.test(actor) ? { actor } : {}),
    ...(prefix ? { action: `${prefix}%` } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
}

export function useAudit(params: ListParams) {
  return useQuery({
    queryKey: queryKeys.admin.audit.list(params),
    queryFn: () =>
      unwrapPage(
        api.GET("/admin/audit", { params: { query: auditQuery(params) } }),
      ),
    staleTime: staleTimes.adminAudit,
    placeholderData: keepPreviousData,
  });
}

/** Users matching a search, for the actor filter (needs `users:read`). */
export function useActorSearch(search: string, enabled: boolean) {
  const term = search.trim();
  const params: ListParams = { page: 1, size: 10, filters: { search: term } };
  return useQuery({
    queryKey: queryKeys.admin.users.list(params),
    queryFn: () =>
      unwrapPage(
        api.GET("/admin/users", {
          params: { query: { page: 1, size: 10, search: term } },
        }),
      ),
    staleTime: staleTimes.adminUsers,
    enabled: enabled && term.length > 0,
  });
}

/** The chosen actor's name, for a filter restored from the URL. */
export function useActorName(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.admin.users.detail(id ?? ""),
    queryFn: () =>
      unwrap(
        api.GET("/admin/users/{id}", { params: { path: { id: id ?? "" } } }),
      ),
    staleTime: staleTimes.adminUsers,
    enabled: enabled && id !== undefined && UUID.test(id),
    select: (user) => user.display_name || user.email,
  });
}
