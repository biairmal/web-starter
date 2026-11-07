import { describe, expect, it } from "vitest";
import { resolveTheme, themeInitScript } from "@/lib/theme";

describe("resolveTheme", () => {
  it("follows the operating system when the preference is system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("ignores the operating system for an explicit preference", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });
});

describe("themeInitScript", () => {
  it("sets data-theme and uses the brand default when nothing is stored", () => {
    const script = themeInitScript("system");
    expect(script).toContain("data-theme");
    expect(script).toContain('"system"');
  });
});
