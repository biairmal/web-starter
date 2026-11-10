// Test-only values for the mock e2e suite. They satisfy the server's env
// validation (src/config/env-schema.ts). Never used outside tests.

export const APP_ORIGIN = "http://localhost:3000";
export const PRISM_ORIGIN = "http://localhost:4010";
/** tests/e2e/mock-identity.mts: answers what must be exact, proxies the rest to Prism. */
export const MOCK_IDENTITY_PORT = 4011;
export const MOCK_IDENTITY_ORIGIN = `http://localhost:${String(MOCK_IDENTITY_PORT)}`;

export const SESSION_SECRET = Buffer.alloc(32, 7).toString("base64");
export const SESSION_COOKIE_PREFIX = "ws";

export const testEnv = {
  APP_URL: APP_ORIGIN,
  IDENTITY_INTERNAL_URL: MOCK_IDENTITY_ORIGIN,
  IDENTITY_PUBLIC_URL: PRISM_ORIGIN,
  SESSION_SECRET,
  SESSION_COOKIE_PREFIX,
};
