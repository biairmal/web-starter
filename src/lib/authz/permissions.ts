// Identity's own permission keys (BE TRD 11; go-identity rbac/config.go).
// Business modules add their keys here. The role editor never reads this list:
// it loads the catalog from GET /v1/admin/permissions (TRD 9).

export const USERS_READ = "users:read";
export const USERS_MANAGE = "users:manage";
export const ROLES_MANAGE = "roles:manage";
export const AUDIT_READ = "audit:read";
export const TENANTS_MANAGE = "tenants:manage";
