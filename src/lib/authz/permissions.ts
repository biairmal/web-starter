// Identity's own permission keys (BE TRD 11; go-identity rbac/config.go).
// Business modules add their keys here. The role editor never reads this list:
// it loads the catalog from GET /v1/admin/permissions (TRD 9).

export const USERS_READ = "users:read";
export const USERS_MANAGE = "users:manage";
export const ROLES_MANAGE = "roles:manage";
export const AUDIT_READ = "audit:read";
export const TENANTS_MANAGE = "tenants:manage";

// The example notes module (go-service-template). `:any` widens a key to
// every note in the tenant; it does not imply the base key (TRD 9).
export const NOTES_READ = "notes:read";
export const NOTES_READ_ANY = "notes:read:any";
export const NOTES_WRITE = "notes:write";
export const NOTES_WRITE_ANY = "notes:write:any";
