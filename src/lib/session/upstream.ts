import "server-only";

import { isIP } from "node:net";
import { env } from "@/config/env";
import type { ErrorReason, TokenResponse } from "@/lib/api/types";
import { REQUEST_ID_HEADER } from "@/lib/bff/request-id";

// What a server-side call to identity carries for the browser it is made for,
// and the shape of a refresh result. Shared by identityFetch and the refresh.

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
