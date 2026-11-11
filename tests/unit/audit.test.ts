import { describe, expect, it } from "vitest";
import { diffSnapshots, formatValue } from "@/features/audit/audit-diff";
import { auditQuery, dayBoundary } from "@/features/audit/use-audit";

describe("auditQuery", () => {
  it("FE-46 sends the actor, the action prefix as a LIKE pattern and the day range", () => {
    const query = auditQuery({
      page: 2,
      size: 50,
      filters: {
        actor: "00000000-0000-4000-8000-00000000b001",
        action: "role.",
        from: "2026-11-01",
        to: "2026-11-10",
      },
    });
    expect(query).toEqual({
      page: 2,
      size: 50,
      actor: "00000000-0000-4000-8000-00000000b001",
      action: "role.%",
      from: new Date(2026, 10, 1).toISOString(),
      to: new Date(2026, 10, 10, 23, 59, 59, 999).toISOString(),
    });
  });

  it("leaves out values identity would refuse", () => {
    expect(
      auditQuery({
        page: 1,
        size: 25,
        filters: { actor: "dina", action: "drop table", from: "yesterday" },
      }),
    ).toEqual({ page: 1, size: 25 });
  });
});

describe("dayBoundary", () => {
  it("reads only YYYY-MM-DD", () => {
    expect(dayBoundary("2026-11-31x", "start")).toBeUndefined();
    expect(dayBoundary(undefined, "end")).toBeUndefined();
    expect(dayBoundary("2026-01-05", "start")).toBe(
      new Date(2026, 0, 5).toISOString(),
    );
  });
});

describe("diffSnapshots", () => {
  it("FE-46 marks each field added, removed, changed or the same", () => {
    expect(
      diffSnapshots(
        { name: "Manager", permissions: ["users:read"], old: true },
        { name: "Manager", permissions: ["audit:read"], added: 1 },
      ),
    ).toEqual([
      { field: "added", before: undefined, after: 1, kind: "added" },
      { field: "name", before: "Manager", after: "Manager", kind: "same" },
      { field: "old", before: true, after: undefined, kind: "removed" },
      {
        field: "permissions",
        before: ["users:read"],
        after: ["audit:read"],
        kind: "changed",
      },
    ]);
  });

  it("handles a missing side", () => {
    expect(diffSnapshots(undefined, { a: 1 })).toEqual([
      { field: "a", before: undefined, after: 1, kind: "added" },
    ]);
    expect(diffSnapshots(undefined, undefined)).toEqual([]);
  });

  it("formats strings as they are and the rest as JSON", () => {
    expect(formatValue("x")).toBe("x");
    expect(formatValue(["a", "b"])).toBe('["a","b"]');
    expect(formatValue(undefined)).toBe("");
  });
});
