import { describe, expect, it } from "vitest";
import { can, isVisible, matches } from "@/lib/authz/can";
import fixtures from "../fixtures/authz-cases.json";

const member = {
  permissions: ["users:read", "notes:*"],
  is_super_admin: false,
};
const superAdmin = { permissions: [], is_super_admin: true };

describe("matches (go-sdk authz test table)", () => {
  it.each(fixtures.cases)("$name", ({ grants, perm, want }) => {
    expect(matches(grants, perm)).toBe(want);
  });
});

describe("can", () => {
  it("checks the user's effective permissions", () => {
    expect(can(member, "users:read")).toBe(true);
    expect(can(member, "users:manage")).toBe(false);
    expect(can(member, "notes:delete:any")).toBe(true);
  });

  it("does not let a held plain key imply its :any form", () => {
    expect(
      can(
        { permissions: ["notes:read"], is_super_admin: false },
        "notes:read:any",
      ),
    ).toBe(false);
  });

  it("lets the super admin pass every key", () => {
    expect(can(superAdmin, "tenants:manage")).toBe(true);
    expect(can(superAdmin, "anything:at:all")).toBe(true);
  });

  it("refuses an empty or wildcard key even for the super admin", () => {
    expect(can(superAdmin, "")).toBe(false);
    expect(can(superAdmin, "users:*")).toBe(false);
  });

  it("refuses without a user", () => {
    expect(can(null, "users:read")).toBe(false);
    expect(can(undefined, "users:read")).toBe(false);
  });
});

describe("isVisible", () => {
  it("shows an entry without gates to every signed-in user", () => {
    expect(isVisible(member, {}, "single")).toBe(true);
    expect(isVisible(null, {}, "single")).toBe(false);
  });

  it("needs the entry's permission", () => {
    expect(isVisible(member, { permission: "users:read" }, "single")).toBe(
      true,
    );
    expect(isVisible(member, { permission: "audit:read" }, "single")).toBe(
      false,
    );
  });

  it("shows super-admin entries only to the super admin", () => {
    expect(isVisible(member, { superAdmin: true }, "multi")).toBe(false);
    expect(isVisible(superAdmin, { superAdmin: true }, "multi")).toBe(true);
  });

  it("shows multi-only entries only in multi mode", () => {
    const tenants = { superAdmin: true, multiOnly: true };
    expect(isVisible(superAdmin, tenants, "single")).toBe(false);
    expect(isVisible(superAdmin, tenants, "multi")).toBe(true);
  });
});
