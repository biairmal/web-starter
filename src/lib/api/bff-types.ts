import type { TenantChoice } from "@/lib/api/types";

// Response bodies of the BFF's own session routes (TRD 7.2). These are the
// BFF's API, not identity's; the identity parts inside them are generated.

/** `POST /api/auth/login`: where to go, or the tenants to choose from (FE-8). */
export type LoginResult =
  | { next: string }
  | { tenant_required: true; tenants: TenantChoice["tenants"] };

/** Session routes that end with a navigation answer `{next}`. */
export type NextResult = { next: string };
