import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/bff/next-path";

describe("safeNext", () => {
  it.each([
    ["/", "/"],
    ["/admin/users", "/admin/users"],
    ["/admin/users?page=2&q=a%20b", "/admin/users?page=2&q=a%20b"],
    ["/account#security", "/account#security"],
  ])("keeps the same-origin path %s", (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });

  it.each([
    "//evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "/\\/evil.com",
    "https://evil.com",
    "http:evil.com",
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:text/html,x",
    "evil.com",
    "",
    " /admin",
    "/\t/evil.com",
    "/\n/evil.com",
    "/admin\u0000",
    `/${"a".repeat(2048)}`,
  ])("rejects %j", (input) => {
    expect(safeNext(input)).toBe("/");
  });

  it("rejects values that are not strings", () => {
    expect(safeNext(undefined)).toBe("/");
    expect(safeNext(null)).toBe("/");
    expect(safeNext(["/admin"])).toBe("/");
  });

  it("normalises dot segments without leaving the origin", () => {
    expect(safeNext("/a/../../b")).toBe("/b");
  });

  it("uses the given fallback", () => {
    expect(safeNext("//evil.com", "/sign-in")).toBe("/sign-in");
  });
});
