import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthConfig, Me } from "@/lib/api/types";
import { requireSuperAdmin } from "@/lib/session/require-permission";
import {
  NEW_TENANT_SLUG_PATTERN,
  slugFromName,
  tenantsQuery,
} from "@/features/tenants/use-tenants";
import { authConfigFixture, meFixture } from "../msw/handlers";

// The super admin's tenant screens: the page guard (TRD 6.1, 6.2) and the
// helpers behind the list and the create form (FE-50).

const loaders = vi.hoisted(() => ({
  me: null as Me | null,
  config: null as AuthConfig | null,
}));

vi.mock("@/lib/session/me", () => ({
  getCurrentMe: () => Promise.resolve(loaders.me),
  getAuthConfig: () => Promise.resolve(loaders.config),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  forbidden: () => {
    throw new Error("NEXT_FORBIDDEN");
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
}));

const superAdmin: Me = { ...meFixture, is_super_admin: true };
const multi: AuthConfig = { ...authConfigFixture, tenancy: "multi" };

describe("requireSuperAdmin", () => {
  beforeEach(() => {
    loaders.me = superAdmin;
    loaders.config = multi;
  });

  it("FE-50 lets the super admin in, in multi mode", async () => {
    await expect(requireSuperAdmin()).resolves.toBe(superAdmin);
  });

  it("FE-50 is a 404 in single mode, even for the super admin", async () => {
    loaders.config = authConfigFixture;
    await expect(requireSuperAdmin()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("is a 404 when the config cannot be loaded", async () => {
    loaders.config = null;
    await expect(requireSuperAdmin()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("FE-50 is a 403 for anyone else, whatever they hold", async () => {
    loaders.me = { ...meFixture, permissions: ["*"] };
    await expect(requireSuperAdmin()).rejects.toThrow("NEXT_FORBIDDEN");
  });
});

describe("slugFromName", () => {
  it.each([
    ["Acme Corp", "acme-corp"],
    ["  PT. Sinar  Jaya, Tbk ", "pt-sinar-jaya-tbk"],
    ["Café Ñandú", "cafe-nandu"],
    ["--Global--", "global"],
    ["日本", ""],
  ])("%s → %s", (name, slug) => {
    expect(slugFromName(name)).toBe(slug);
  });

  it("stays within identity's 63 characters without a trailing hyphen", () => {
    const slug = slugFromName(`${"a".repeat(62)} b`);
    expect(slug).toBe("a".repeat(62));
    expect(NEW_TENANT_SLUG_PATTERN.test(slug)).toBe(true);
  });
});

describe("NEW_TENANT_SLUG_PATTERN", () => {
  it.each(["ab", "acme", "a-1", "9lives", "a".repeat(63)])(
    "accepts %s",
    (slug) => {
      expect(NEW_TENANT_SLUG_PATTERN.test(slug)).toBe(true);
    },
  );

  it.each(["", "a", "-acme", "Acme", "acme_co", "ac me", "a".repeat(64)])(
    "refuses %j",
    (slug) => {
      expect(NEW_TENANT_SLUG_PATTERN.test(slug)).toBe(false);
    },
  );
});

describe("tenantsQuery", () => {
  it("sends the status and search it knows, and drops anything else", () => {
    expect(
      tenantsQuery({
        page: 2,
        size: 25,
        filters: { status: "suspended", search: "ac" },
      }),
    ).toEqual({ page: 2, size: 25, status: "suspended", search: "ac" });
    expect(
      tenantsQuery({ page: 1, size: 25, filters: { status: "deleted" } }),
    ).toEqual({ page: 1, size: 25 });
  });
});
