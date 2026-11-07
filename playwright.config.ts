import { defineConfig, devices } from "@playwright/test";

// Test-only values. They satisfy the server's env validation (src/config/env-schema.ts)
// and point at the Prism mock. Never used outside tests.
const testEnv = {
  APP_URL: "http://localhost:3000",
  IDENTITY_INTERNAL_URL: "http://localhost:4010",
  IDENTITY_PUBLIC_URL: "http://localhost:4010",
  SESSION_SECRET: Buffer.alloc(32, 7).toString("base64"),
};

// With E2E_BASE_URL set (the full suite against a real identity stack), no
// servers are started here. Otherwise the mock project starts Prism and next dev.
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
          command: "pnpm run dev",
          url: "http://localhost:3000",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: { ...process.env, ...testEnv },
        },
      ],
});
