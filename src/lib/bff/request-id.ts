import "server-only";

import { randomUUID } from "node:crypto";

/** Header that carries the request ID to identity and back to the browser. */
export const REQUEST_ID_HEADER = "X-Request-Id";

/**
 * A new request ID. The BFF always makes its own and ignores one sent by the
 * browser, so log lines cannot be forged into another request's trail.
 */
export function newRequestId(): string {
  return randomUUID();
}
