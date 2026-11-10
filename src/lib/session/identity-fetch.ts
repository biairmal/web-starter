import "server-only";

import { env } from "@/config/env";
import { BffError, reasonOf } from "@/lib/bff/envelope";
import {
  type CookieWriter,
  applyCookies,
  sealSessionCookies,
} from "@/lib/session/cookies";
import { refreshOnce } from "@/lib/session/refresh";
import type { Session } from "@/lib/session/server";
import {
  type RefreshFn,
  type UpstreamCall,
  upstreamHeaders,
} from "@/lib/session/upstream";

export {
  type RefreshFn,
  type RefreshResult,
  type UpstreamCall,
  callFor,
  clientIp,
  upstreamHeaders,
} from "@/lib/session/upstream";

// Server-side calls to identity, and to resource services behind the same
// bearer token (TRD 5.2).

/** Upstream calls that take longer than this fail as UPSTREAM_UNAVAILABLE. */
const UPSTREAM_TIMEOUT_MS = 15_000;

export type AuthorizedFetchOptions = {
  call: UpstreamCall;
  /**
   * Where cookies from a refresh go. Without it the 401 is not retried,
   * because a rotated refresh token the browser never receives would end the
   * session at its next refresh. Server Components cannot set cookies.
   */
  cookies?: CookieWriter;
  /** Replaces the process-wide single-flight refresh, for tests. */
  refresh?: RefreshFn;
};

/** The request body must be re-sendable, because a 401 is retried once. */
export type UpstreamInit = Omit<RequestInit, "body"> & {
  body?: Uint8Array | string;
};

async function send(
  url: string,
  init: UpstreamInit,
  accessToken: string,
  call: UpstreamCall,
): Promise<Response> {
  const headers = upstreamHeaders(call, init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  try {
    return await fetch(url, {
      ...init,
      // A Uint8Array is a valid body; the cast only widens its buffer type.
      body: init.body as BodyInit | undefined,
      headers,
      redirect: "manual",
      cache: "no-store",
      signal: init.signal ?? AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    throw BffError.upstreamUnavailable();
  }
}

/**
 * Reads a 401's body to see whether it carries a reason. Returns the reason
 * and a copy of the response that can still be read.
 */
async function inspect401(
  response: Response,
): Promise<{ reason: string | undefined; response: Response }> {
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  return {
    reason: reasonOf(body),
    response: new Response(text, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    }),
  };
}

/**
 * Calls an upstream URL with the session's bearer token. A 401 without
 * `meta.reason` (identity rejected the access token) refreshes once and
 * retries once; a second such 401 ends the session. A 401 with a reason, such
 * as INVALID_CREDENTIALS for a wrong current password, is returned unchanged.
 *
 * Throws `BffError` SESSION_ENDED or UPSTREAM_UNAVAILABLE.
 */
export async function authorizedFetch(
  url: string,
  init: UpstreamInit,
  session: Session,
  options: AuthorizedFetchOptions,
): Promise<Response> {
  const first = await send(url, init, session.accessToken, options.call);
  if (first.status !== 401) {
    return first;
  }
  const checked = await inspect401(first);
  if (checked.reason !== undefined) {
    return checked.response;
  }
  if (!options.cookies) {
    throw BffError.sessionEnded("NO_SESSION");
  }

  const refresh = options.refresh ?? refreshOnce;
  const result = await refresh(
    session.sessionId,
    session.refreshToken,
    options.call,
  );
  if (result.kind === "ended") {
    throw BffError.sessionEnded(result.reason);
  }
  if (result.kind === "unavailable") {
    throw BffError.upstreamUnavailable();
  }
  applyCookies(options.cookies, await sealSessionCookies(result.tokens));

  const second = await send(
    url,
    init,
    result.tokens.access_token,
    options.call,
  );
  if (second.status !== 401) {
    return second;
  }
  const again = await inspect401(second);
  if (again.reason !== undefined) {
    return again.response;
  }
  throw BffError.sessionEnded("NO_SESSION");
}

/** `authorizedFetch` against identity: `path` starts with "/v1/". */
export function identityFetch(
  path: string,
  init: UpstreamInit,
  session: Session,
  options: AuthorizedFetchOptions,
): Promise<Response> {
  return authorizedFetch(
    `${env.IDENTITY_INTERNAL_URL.replace(/\/$/, "")}${path}`,
    init,
    session,
    options,
  );
}
