import type { Me } from "@/lib/api/types";

// Permission checks in the UI (TRD 9). They only shape navigation and
// buttons; identity enforces every rule.

/**
 * Whether any grant covers `perm`, exactly as go-sdk `authz.Matches`: `*`
 * covers everything, `resource:*` covers every key under `resource:` (also
 * `resource:read:any`), anything else must be equal. A held `x:y:any` does
 * not cover `x:y`. A checked key that is empty or contains `*` never matches.
 */
export function matches(grants: readonly string[], perm: string): boolean {
  if (perm === "" || perm.includes("*")) {
    return false;
  }
  return grants.some((grant) => {
    if (grant === "*" || grant === perm) {
      return true;
    }
    return grant.endsWith(":*") && perm.startsWith(grant.slice(0, -1));
  });
}

export type Subject = Pick<Me, "permissions" | "is_super_admin">;

/** Whether the user may do `key`. The super admin passes every valid key. */
export function can(me: Subject | null | undefined, key: string): boolean {
  if (!me || key === "" || key.includes("*")) {
    return false;
  }
  return me.is_super_admin || matches(me.permissions, key);
}

/** What decides whether a navigation entry shows (TRD 4.3). */
export type Gated = {
  permission?: string;
  superAdmin?: boolean;
  multiOnly?: boolean;
};

export type Tenancy = "single" | "multi";

/** Whether a gated entry shows for this user and tenancy mode. */
export function isVisible(
  me: Subject | null | undefined,
  item: Gated,
  tenancy: Tenancy,
): boolean {
  if (!me) {
    return false;
  }
  if (item.multiOnly && tenancy !== "multi") {
    return false;
  }
  if (item.superAdmin && !me.is_super_admin) {
    return false;
  }
  return item.permission === undefined || can(me, item.permission);
}
