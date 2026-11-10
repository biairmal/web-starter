import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Test-only values. They satisfy the server's env validation
// (src/config/env-schema.ts) so server modules can be imported. Identity calls
// go to a host that only MSW answers.
const testEnv = {
  APP_URL: "http://localhost:3000",
  IDENTITY_INTERNAL_URL: "http://identity.test",
  IDENTITY_PUBLIC_URL: "https://id.example.test",
  SESSION_SECRET: Buffer.alloc(32, 7).toString("base64"),
  SESSION_COOKIE_PREFIX: "ws",
  TRUSTED_PROXY_HOPS: "1",
  LOG_LEVEL: "silent",
};

export default defineConfig({
  plugins: [react()],
  // Components that import CSS (global-error.tsx) need no styles in tests; an
  // inline config stops Vite loading the Tailwind PostCSS plugin.
  css: { postcss: { plugins: [] } },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/component/**/*.test.{ts,tsx}",
    ],
    setupFiles: ["tests/setup.ts"],
    environment: "node",
    env: testEnv,
  },
});
