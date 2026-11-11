import { describe, expect, it, vi } from "vitest";
import type { AuthConfig } from "@/lib/api/types";

// /sign-up exists only while registration is open (TRD 6.1, FE-4).

const config = vi.fn<() => Promise<AuthConfig | null>>();

vi.mock("@/lib/session/me", () => ({
  getAuthConfig: () => config(),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: () => Promise.resolve((key: string) => key),
}));

const { default: SignUpPage } = await import("@/app/(public)/sign-up/page");

const open: AuthConfig = {
  providers: { password: true, google: false },
  registration: true,
  tenancy: "single",
};

describe("/sign-up", () => {
  it("FE-4 is a 404 when registration is closed", async () => {
    config.mockResolvedValue({ ...open, registration: false });
    await expect(SignUpPage()).rejects.toMatchObject({
      digest: expect.stringContaining("404") as unknown,
    });
  });

  it("is a 404 when identity cannot say", async () => {
    config.mockResolvedValue(null);
    await expect(SignUpPage()).rejects.toMatchObject({
      digest: expect.stringContaining("404") as unknown,
    });
  });

  it("renders the form when registration is open", async () => {
    config.mockResolvedValue(open);
    await expect(SignUpPage()).resolves.toBeTruthy();
  });
});
