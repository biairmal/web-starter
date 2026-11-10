import createClient from "openapi-fetch";
import { ApiError } from "@/lib/api/errors";
import type { paths } from "@/lib/api/schema";

// The browser's client for identity, through the BFF proxy `/api/id` (TRD 7.4,
// 8.2). Requests carry the custom header the BFF's CSRF check needs (TRD 7.1).

/** The value of `X-Requested-With` the BFF requires on every mutating call. */
export const REQUESTED_WITH = "web-starter";

/**
 * The identity paths the proxy forwards, without their `/v1` prefix: `me`,
 * `me/*` except `me/password`, and `admin/*`. A path the proxy refuses is not
 * in the type, so calling it fails the type check.
 */
export type ProxiedPaths = {
  [
    K in keyof paths as K extends `/v1/${infer Rest}`
      ? Rest extends "me/password"
        ? never
        : Rest extends "me" | `me/${string}` | `admin/${string}`
          ? `/${Rest}`
          : never
      : never
  ]: paths[K];
};

/** The BFF proxy prefix for identity (TRD 7.4). */
export const IDENTITY_PROXY_PREFIX = "/api/id";

/**
 * A client for the proxy at `baseUrl`. The default is absolute in a browser
 * (same origin), because a relative URL cannot build a `Request` outside one.
 */
export function createApiClient(
  baseUrl: string = typeof window === "undefined"
    ? IDENTITY_PROXY_PREFIX
    : `${window.location.origin}${IDENTITY_PROXY_PREFIX}`,
) {
  return createClient<ProxiedPaths>({
    baseUrl,
    headers: { "X-Requested-With": REQUESTED_WITH },
    // Looked up per call, so a fetch replaced after load (tests, MSW) is used.
    fetch: (request) => globalThis.fetch(request),
  });
}

export const api = createApiClient();

/** What every `api.GET(…)`, `api.POST(…)`… call resolves to. */
type FetchResult = { data?: unknown; error?: unknown; response: Response };

/**
 * The `data` of the success envelope `{timestamp, data}` in a result, or
 * `undefined` for a response without a body (204). Only the success branch of
 * openapi-fetch's result union has a required `data`. The spec marks the
 * envelope's `data` optional, but identity always sends it on a success.
 */
export type Unwrapped<R> = R extends { data: infer Body }
  ? Body extends { data?: infer T }
    ? NonNullable<T>
    : undefined
  : never;

/**
 * Returns the `data` of a success envelope, or throws `ApiError` with the
 * reason, field errors, retry delay and request ID of an error envelope.
 */
export async function unwrap<R extends FetchResult>(
  request: Promise<R> | R,
): Promise<Unwrapped<R>> {
  const { data, error, response } = await request;
  if (!response.ok) {
    throw ApiError.from(response, error);
  }
  if (typeof data === "object" && data !== null && "data" in data) {
    return data.data as Unwrapped<R>;
  }
  return undefined as Unwrapped<R>;
}
