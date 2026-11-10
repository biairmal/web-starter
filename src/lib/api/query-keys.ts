// Query keys and how long each kind of data stays fresh (TRD 8.4). Every
// TanStack Query hook takes its key from here.

/** List parameters mirrored in the URL (TRD 8.3). */
export type ListParams = {
  page: number;
  size: number;
  sort?: string;
  filters: Record<string, string>;
};

export const queryKeys = {
  config: ["config"] as const,
  me: ["me"] as const,
  meTenants: ["me", "tenants"] as const,
  meSessions: ["me", "sessions"] as const,
  admin: {
    users: {
      all: ["admin", "users"] as const,
      list: (params: ListParams) => ["admin", "users", params] as const,
      detail: (id: string) => ["admin", "users", id] as const,
    },
    roles: {
      all: ["admin", "roles"] as const,
      list: (params: ListParams) => ["admin", "roles", params] as const,
      detail: (id: string) => ["admin", "roles", id] as const,
    },
    permissions: ["admin", "permissions"] as const,
    audit: {
      all: ["admin", "audit"] as const,
      list: (params: ListParams) => ["admin", "audit", params] as const,
    },
    tenants: {
      all: ["admin", "tenants"] as const,
      list: (params: ListParams) => ["admin", "tenants", params] as const,
      detail: (id: string) => ["admin", "tenants", id] as const,
    },
    roleTemplates: {
      all: ["admin", "role-templates"] as const,
      list: (params: ListParams) =>
        ["admin", "role-templates", params] as const,
      detail: (id: string) => ["admin", "role-templates", id] as const,
    },
  },
} as const;

const SECOND = 1000;
const MINUTE = 60 * SECOND;

/** `staleTime` per key (TRD 8.4). */
export const staleTimes = {
  config: 5 * MINUTE,
  me: 60 * SECOND,
  meTenants: 5 * MINUTE,
  meSessions: 0,
  adminUsers: 30 * SECOND,
  adminRoles: 30 * SECOND,
  adminPermissions: 10 * MINUTE,
  adminAudit: 0,
  adminTenants: 30 * SECOND,
  adminRoleTemplates: 30 * SECOND,
} as const;

/** `me` is also refetched on this interval, so role changes show up (TRD 9). */
export const ME_REFETCH_INTERVAL = 5 * MINUTE;
