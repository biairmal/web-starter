import "server-only";

import { type Env, parseEnv } from "@/config/env-schema";

let cached: Env | undefined;

/**
 * Validates the environment once and returns it. A bad or missing variable
 * throws an EnvError that names it. Called when the server starts (see
 * src/instrumentation.ts), so a bad environment stops the process.
 */
export function validateEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}

/**
 * The validated server environment. Read on first use rather than at import,
 * because `next build` imports route modules without a runtime environment.
 */
export const env: Env = new Proxy({} as Env, {
  get(_target, key) {
    return validateEnv()[key as keyof Env];
  },
  set() {
    throw new TypeError("env is read-only");
  },
});

export type { Env } from "@/config/env-schema";
