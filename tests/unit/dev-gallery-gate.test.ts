import { afterEach, describe, expect, it, vi } from "vitest";

// The component gallery must not exist in a production build.

vi.mock("@/dev/gallery/gallery", () => ({ ComponentGallery: () => null }));
vi.mock("@/components/layout/page-header", () => ({ PageHeader: () => null }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

const { default: ComponentsPage } =
  await import("@/app/(app)/dev/components/page");

describe("/dev/components", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is a 404 in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => ComponentsPage()).toThrow("NOT_FOUND");
  });

  it("renders in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(ComponentsPage()).toBeTruthy();
  });
});
