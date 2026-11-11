import type { components } from "@/lib/api/schema";

// Named aliases over the generated identity types (TRD 8.2). Feature code
// imports from here, never from schema.d.ts or raw paths.

type Schemas = components["schemas"];

/** One page of a list (go-sdk PageResponse, BE TRD 9.1). */
export type Page<T> = Omit<Schemas["PageResponse"], "items"> & { items: T[] };

export type Me = Schemas["Me"];
export type AuthConfig = Schemas["AuthConfig"];
/** The token response body (BE TRD 9.3). The spec names its wrapper TokenResponse. */
export type TokenResponse = Schemas["TokenPayload"];
export type TenantChoice = Schemas["TenantChoice"];
export type Tenant = Schemas["Tenant"];
export type AdminUser = Schemas["AdminUser"];
export type AdminUserDetail = Schemas["AdminUserDetail"];
export type Role = Schemas["Role"];
/** One row of the roles list, with its user and permission counts. */
export type RoleSummary = Schemas["RoleSummary"];
/** A role as a user carries it: id and name. */
export type RoleRef = Schemas["RoleRef"];
/** The Role schema carries permissions and version, so it serves as the detail type. */
export type RoleDetail = Schemas["Role"];
/**
 * identity.yaml has no RoleTemplate schema; the role-template operations type
 * their items as Role. Revisit when the spec gains its own schema.
 */
export type RoleTemplate = Schemas["Role"];
export type Permission = Schemas["Permission"];
export type AuditEntry = Schemas["AuditEntry"];
export type Session = Schemas["Session"];
/** What an invite is for, before it is accepted (BE TRD 9.4). */
export type InvitePreview = Schemas["InvitePreview"];

/** Error envelope (BE TRD 9.1). Branch on error.meta.reason, never on message. */
export type ApiError = Schemas["ErrorEnvelope"];

/** Every meta.reason identity can return (BE TRD 9.2). */
export type ErrorReason = Schemas["Reason"];
