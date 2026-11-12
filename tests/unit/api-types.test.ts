import { readFileSync } from "node:fs";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { ProxiedPaths } from "@/lib/api/client";
import { generateSchema, listSpecs } from "../../scripts/api-schema.mts";

// FE-61: the API client is generated from identity's OpenAPI file, so a
// backend change shows up as a type error (`pnpm api:check` in CI).

describe("generated API types", () => {
  it("FE-61 the committed types match every pinned spec", async () => {
    const specs = listSpecs();
    expect(specs.map((spec) => spec.name)).toContain("identity");
    for (const spec of specs) {
      expect(readFileSync(spec.schemaPath, "utf8"), spec.file).toBe(
        await generateSchema(spec),
      );
    }
  }, 30_000);

  it("FE-61 a path the BFF refuses is not in the client's type", () => {
    expectTypeOf<ProxiedPaths>().toHaveProperty("/me");
    expectTypeOf<ProxiedPaths>().toHaveProperty("/admin/users");
    expectTypeOf<keyof ProxiedPaths>().not.toEqualTypeOf<"/me/password">();
    type Refused = Extract<keyof ProxiedPaths, "/me/password" | "/auth/login">;
    expectTypeOf<Refused>().toBeNever();
  });
});
