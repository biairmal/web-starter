import { describe, expect, it } from "vitest";
import {
  describeChanges,
  filterGroups,
  groupPermissions,
  permissionChanges,
  resourceOf,
} from "@/features/admin-roles/group-permissions";
import type { Permission } from "@/lib/api/types";

const p = (key: string, description = key): Permission => ({
  key,
  description,
  is_system: false,
});

describe("groupPermissions", () => {
  it("FE-44 groups by the text before the first colon, sorted", () => {
    const groups = groupPermissions([
      p("users:read"),
      p("notes:write"),
      p("notes:read:any"),
      p("audit:read"),
      p("notes:read"),
      p("billing"),
    ]);
    expect(groups.map((group) => group.resource)).toEqual([
      "audit",
      "billing",
      "notes",
      "users",
    ]);
    expect(groups[2]?.items.map((item) => item.key)).toEqual([
      "notes:read",
      "notes:read:any",
      "notes:write",
    ]);
  });

  it("reads the resource of a key with or without a scope", () => {
    expect(resourceOf("notes:read:any")).toBe("notes");
    expect(resourceOf("notes:read")).toBe("notes");
    expect(resourceOf("billing")).toBe("billing");
  });

  it("is empty for an empty catalog", () => {
    expect(groupPermissions([])).toEqual([]);
  });
});

describe("filterGroups", () => {
  const groups = groupPermissions([
    p("notes:read", "Read notes"),
    p("notes:write", "Write notes"),
    p("users:read", "See users"),
  ]);

  it("keeps matches by key or description and counts the hidden ones", () => {
    const result = filterGroups(groups, "WRITE");
    expect(result.groups).toEqual([
      { resource: "notes", items: [p("notes:write", "Write notes")] },
    ]);
    expect(result.hidden).toBe(2);
    expect(filterGroups(groups, "see").groups[0]?.resource).toBe("users");
  });

  it("returns everything for an empty search", () => {
    expect(filterGroups(groups, "  ")).toEqual({ groups, hidden: 0 });
  });
});

describe("permissionChanges and describeChanges", () => {
  it("FE-45 lists what a save adds and removes, for Copy my changes", () => {
    const changes = permissionChanges(
      new Set(["notes:read", "users:read"]),
      new Set(["notes:read", "notes:write", "audit:read"]),
    );
    expect(changes).toEqual({
      added: ["audit:read", "notes:write"],
      removed: ["users:read"],
    });
    expect(describeChanges(changes, { name: "Support" })).toBe(
      "name: Support\n+ audit:read\n+ notes:write\n- users:read",
    );
  });
});
