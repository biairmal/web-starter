import "server-only";

// Which upstream paths a proxy may forward (TRD 7.4). Anything not allowed is
// 404 NOT_ALLOWED. Rules are written without the version prefix:
//   "admin/users"     that path only
//   "admin/users/**"  any path below it

export type PathRule = string;

export type AllowList = {
  allow: readonly PathRule[];
  /** Checked first: a denied path is refused even when a rule allows it. */
  deny?: readonly PathRule[];
};

/** Identity paths the browser may reach through `/api/id/*` (TRD 7.4). */
export const identityAllowList: AllowList = {
  allow: [
    // BE TRD 9.5
    "me",
    "me/**",
    // BE TRD 9.6
    "admin/users",
    "admin/users/**",
    "admin/roles",
    "admin/roles/**",
    "admin/permissions",
    "admin/audit",
    // BE TRD 9.7
    "admin/tenants",
    "admin/tenants/**",
    "admin/role-templates",
    "admin/role-templates/**",
  ],
  // The password change sets cookies, so it has its own route.
  deny: ["me/password", "me/password/**"],
};

// Control characters, slash, backslash and percent. Route params arrive
// decoded, so a "%2F" inside a segment shows up here as "/".
const UNSAFE_SEGMENT = /[\x00-\x1f\x7f/\\%]/;

/**
 * Checks decoded path segments. Returns `null` for an empty path or any
 * empty, "." or ".." segment, or one with a slash, backslash, percent sign or
 * control character, so nothing can step outside an allowed prefix.
 */
export function cleanSegments(
  segments: readonly string[] | undefined,
): string[] | null {
  if (!segments || segments.length === 0) {
    return null;
  }
  for (const segment of segments) {
    if (
      segment === "" ||
      segment === "." ||
      segment === ".." ||
      UNSAFE_SEGMENT.test(segment)
    ) {
      return null;
    }
  }
  return [...segments];
}

function matches(rule: PathRule, segments: readonly string[]): boolean {
  if (rule.endsWith("/**")) {
    const prefix = rule.slice(0, -3).split("/");
    return (
      segments.length > prefix.length &&
      prefix.every((part, index) => segments[index] === part)
    );
  }
  const exact = rule.split("/");
  return (
    segments.length === exact.length &&
    exact.every((part, index) => segments[index] === part)
  );
}

export function isAllowed(
  segments: readonly string[],
  list: AllowList,
): boolean {
  if (list.deny?.some((rule) => matches(rule, segments))) {
    return false;
  }
  return list.allow.some((rule) => matches(rule, segments));
}
