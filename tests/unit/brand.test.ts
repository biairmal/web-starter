import { describe, expect, it } from "vitest";
import { brand } from "@/config/brand";
import { brandSchema } from "@/config/brand-schema";

describe("brand config", () => {
  it("FE-60 the one brand file matches the brand schema", () => {
    expect(brandSchema.safeParse(brand).success).toBe(true);
  });

  it("rejects an app name longer than 24 characters", () => {
    const result = brandSchema.safeParse({
      ...brand,
      appName: "x".repeat(25),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a support address that is not an email", () => {
    const result = brandSchema.safeParse({
      ...brand,
      supportEmail: "support at example",
    });
    expect(result.success).toBe(false);
  });
});
