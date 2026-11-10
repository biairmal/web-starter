import { defineConfig, devices } from "@playwright/test";
import { MOCK_IDENTITY_ORIGIN, testEnv } from "./tests/e2e/env";

// With E2E_BASE_URL set (the full suite against a real identity stack), no
// servers are started here. Otherwise the mock project starts Prism, the mock
// identity in front of it (tests/e2e/mock-identity.mts) and next dev.
const externalBaseUrl = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: externalBaseUrl ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mock",
      testDir: "tests/e2e/mock",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "full",
      testDir: "tests/e2e/full",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : [
        {
          command: "pnpm run mock",
          url: "http://localhost:4010/v1/auth/config",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: "pnpm exec tsx tests/e2e/mock-identity.mts",
          url: `${MOCK_IDENTITY_ORIGIN}/healthz`,
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
        {
          command: "pnpm run dev",
          // A static file: every page redirects until the visitor signs in.
          url: "http://localhost:3000/brand/mark.svg",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: { ...process.env, ...testEnv },
        },
      ],
});
