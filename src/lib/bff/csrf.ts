import "server-only";

import { env } from "@/config/env";
import { BffError } from "@/lib/bff/envelope";

// CSRF check for every mutating /api request (TRD 7.1, 11.1): the Origin must
// be this app's, and the custom header must be present. A cross-site form or
// a no-cors fetch cannot set the header.

export const CSRF_HEADER = "X-Requested-With";
export const CSRF_HEADER_VALUE = "web-starter";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function passesCsrf(
  method: string,
  headers: Headers,
  appOrigin: string = new URL(env.APP_URL).origin,
): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) {
    return true;
  }
  return (
    headers.get("origin") === appOrigin &&
    headers.get(CSRF_HEADER) === CSRF_HEADER_VALUE
  );
}

/** Throws `CSRF_FAILED` when a mutating request fails the check. */
export function assertCsrf(request: Request): void {
  if (!passesCsrf(request.method, request.headers)) {
    throw BffError.csrfFailed();
  }
}
