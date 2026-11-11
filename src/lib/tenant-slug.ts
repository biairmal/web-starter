/**
 * A tenant slug as identity accepts it: lowercase letters, digits and
 * hyphens, starting with a letter or digit. Anything else is dropped before
 * it reaches a URL or a cookie.
 */
export const TENANT_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;

export function cleanTenantSlug(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const slug = value.trim().toLowerCase();
  return TENANT_SLUG_PATTERN.test(slug) ? slug : undefined;
}
