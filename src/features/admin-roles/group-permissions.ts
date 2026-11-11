import type { Permission } from "@/lib/api/types";

// The permission catalog as the role editor shows it (TRD 8.3, DESIGN_BRIEF
// 6.4): grouped by resource, the text before the first ":". The catalog comes
// from GET /v1/admin/permissions, never from a list in the code.

export type PermissionGroup = { resource: string; items: Permission[] };

export function resourceOf(key: string): string {
  const index = key.indexOf(":");
  return index === -1 ? key : key.slice(0, index);
}

/** Groups in alphabetical order of resource, keys in order within each. */
export function groupPermissions(
  catalog: readonly Permission[],
): PermissionGroup[] {
  const groups = new Map<string, Permission[]>();
  for (const permission of catalog) {
    const resource = resourceOf(permission.key);
    const items = groups.get(resource);
    if (items) {
      items.push(permission);
    } else {
      groups.set(resource, [permission]);
    }
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([resource, items]) => ({
      resource,
      items: [...items].sort((a, b) => a.key.localeCompare(b.key)),
    }));
}

/**
 * The groups with only the permissions whose key or description contains
 * `search` (any case); a group with no match is left out.
 */
export function filterGroups(
  groups: readonly PermissionGroup[],
  search: string,
): { groups: PermissionGroup[]; hidden: number } {
  const needle = search.trim().toLowerCase();
  if (!needle) {
    return { groups: [...groups], hidden: 0 };
  }
  let hidden = 0;
  const kept: PermissionGroup[] = [];
  for (const group of groups) {
    const items = group.items.filter(
      (permission) =>
        permission.key.toLowerCase().includes(needle) ||
        permission.description.toLowerCase().includes(needle),
    );
    hidden += group.items.length - items.length;
    if (items.length > 0) {
      kept.push({ resource: group.resource, items });
    }
  }
  return { groups: kept, hidden };
}

export type PermissionChanges = { added: string[]; removed: string[] };

/** What a save would add and remove, each sorted. */
export function permissionChanges(
  saved: ReadonlySet<string>,
  current: ReadonlySet<string>,
): PermissionChanges {
  return {
    added: [...current].filter((key) => !saved.has(key)).sort(),
    removed: [...saved].filter((key) => !current.has(key)).sort(),
  };
}

/** The user's edits as plain text, for "Copy my changes" (TRD 8.5). */
export function describeChanges(
  changes: PermissionChanges,
  fields: { name?: string; description?: string } = {},
): string {
  const lines: string[] = [];
  if (fields.name !== undefined) {
    lines.push(`name: ${fields.name}`);
  }
  if (fields.description !== undefined) {
    lines.push(`description: ${fields.description}`);
  }
  lines.push(...changes.added.map((key) => `+ ${key}`));
  lines.push(...changes.removed.map((key) => `- ${key}`));
  return lines.join("\n");
}
