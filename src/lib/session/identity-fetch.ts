import "server-only";

import { isIP } from "node:net";
import { env } from "@/config/env";
import type { ErrorReason, TokenResponse } from "@/lib/api/types";
import { BffError, reasonOf } from "@/lib/bff/envelope";
import { REQUEST_ID_HEADER } from "@/lib/bff/request-id";
import {
  type CookieWriter,
  applyCookies,
  sealSessionCookies,
} from "@/lib/session/cookies";
import type { Session } from "@/lib/session/server";

// Server-side calls to identity, and to resource services behind the same
// bearer token (TRD 5.2).

/** Upstream calls that take longer than this fail as UPSTREAM_UNAVAILABLE. */
const UPSTREAM_TIMEOUT_MS = 15_000;

export type RefreshResult =
  | { kind: "ok"; tokens: TokenResponse }
  | { kind: "ended"; reason: ErrorReason }
  | { kind: "unavailable" };

/** Exchanges the session's refresh token for new tokens (TRD 5.3). */
export type RefreshFn = (
  sessionId: string,
  refreshToken: string,
  call: UpstreamCall,
) => Promise<RefreshResult>;

/** Who the call is made for: forwarded to identity for its logs and session list. */
export type UpstreamCall = {
  requestId: string;
  clientIp?: string;
  userAgent?: string;
};

/**
 * The client IP from `X-Forwarded-For`, trusting the last `hops` entries
 * (each proxy in front of the app appends one). With 0 hops, the header is
 * ignored. Returns `undefined` when there is no valid IP.
 */
export function clientIp(
  headers: Headers,
  hops: number = env.TRUSTED_PROXY_HOPS,
): string | undefined {
  if (hops <= 0) {
    return undefined;
  }
  const entries = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const candidate = entries[Math.max(0, entries.length - hops)];
  return candidate !== undefined && isIP(candidate) !== 0
    ? candidate
    : undefined;
}

/** The upstream call details for an incoming browser request. */
export function callFor(request: Request, requestId: string): UpstreamCall {
  const userAgent = request.headers.get("user-agent") ?? undefined;
  const ip = clientIp(request.headers);
  return {
    requestId,
    ...(ip === undefined ? {} : { clientIp: ip }),
    ...(userAgent === undefined ? {} : { userAgent }),
  };
}

/** Headers identity expects on every call made for a browser (TRD 5.2). */
export function upstreamHeaders(
  call: UpstreamCall,
  init?: HeadersInit,
): Headers {
  const headers = new Headers(init);
  headers.set(REQUEST_ID_HEADER, call.requestId);
  if (call.clientIp !== undefined) {
    headers.set("X-Forwarded-For", call.clientIp);
  }
  if (call.userAgent !== undefined) {
    headers.set("User-Agent", call.userAgent);
  }
  return headers;
}

export type AuthorizedFetchOptions = {
  call: UpstreamCall;
  /**
   * Where cookies from a refresh go. Without it the 401 is not retried,
   * because a rotated refresh token the browser never receives would end the
   * session at its next refresh. Server Components cannot set cookies.
   */
  cookies?: CookieWriter;
  refresh?: RefreshFn;
};

/**
 * Placeholder until the single-flight refresh is wired in: the session ends,
 * which is the safe answer when identity rejects the access token.
 */
const endSession: RefreshFn = () =>
  Promise.resolve({ kind: "ended", reason: "INVALID_CREDENTIALS" });

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

  const refresh = options.refresh ?? endSession;
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
