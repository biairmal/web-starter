import "server-only";

import { env } from "@/config/env";
import type { ErrorReason, TokenResponse } from "@/lib/api/types";
import { reasonOf } from "@/lib/bff/envelope";
import {
  type RefreshFn,
  type RefreshResult,
  type UpstreamCall,
  upstreamHeaders,
} from "@/lib/session/upstream";

// Single-flight refresh per session (TRD 5.3, BE APP_FLOW 7).

/** How long a settled refresh is reused for the same session. */
export const REFRESH_HOLD_MS = 10_000;
const REFRESH_TIMEOUT_MS = 5_000;

/** Exchanges one refresh token with identity. Never throws. */
export type FetchTokens = (
  refreshToken: string,
  call: UpstreamCall,
) => Promise<RefreshResult>;

type InFlight = Map<string, Promise<RefreshResult>>;

/**
 * Returns a refresh function that makes at most one upstream call per session
 * at a time. Callers that arrive while it runs, or up to `holdMs` after it
 * settles, get the same result, so a request still carrying the old refresh
 * cookie never presents a rotated token.
 */
export function createRefresher(options: {
  fetchTokens: FetchTokens;
  holdMs?: number;
  inFlight?: InFlight;
}): RefreshFn {
  const holdMs = options.holdMs ?? REFRESH_HOLD_MS;
  const inFlight: InFlight =
    options.inFlight ?? new Map<string, Promise<RefreshResult>>();

  return (sessionId, refreshToken, call) => {
    const existing = inFlight.get(sessionId);
    if (existing) {
      return existing;
    }
    const promise = options
      .fetchTokens(refreshToken, call)
      .catch((): RefreshResult => ({ kind: "unavailable" }));
    inFlight.set(sessionId, promise);
    void promise.then(() => {
      const timer = setTimeout(() => {
        if (inFlight.get(sessionId) === promise) {
          inFlight.delete(sessionId);
        }
      }, holdMs);
      timer.unref();
    });
    return promise;
  };
}

function hasTokens(value: unknown): value is { data: TokenResponse } {
  if (typeof value !== "object" || value === null || !("data" in value)) {
    return false;
  }
  const { data } = value;
  return (
    typeof data === "object" &&
    data !== null &&
    "access_token" in data &&
    typeof data.access_token === "string" &&
    "refresh_token" in data &&
    typeof data.refresh_token === "string"
  );
}

/** `POST /v1/auth/refresh`, mapped to ok, ended or unavailable (TRD 5.3 steps 4–6). */
export const fetchRefresh: FetchTokens = async (refreshToken, call) => {
  let response: Response;
  try {
    response = await fetch(
      `${env.IDENTITY_INTERNAL_URL.replace(/\/$/, "")}/v1/auth/refresh`,
      {
        method: "POST",
        headers: upstreamHeaders(call, { "Content-Type": "application/json" }),
        body: JSON.stringify({ refresh_token: refreshToken }),
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
      },
    );
  } catch {
    return { kind: "unavailable" };
  }

  // Identity down or rate limiting: keep the session (step 6).
  if (response.status === 429 || response.status >= 500) {
    return { kind: "unavailable" };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  if (response.ok) {
    return hasTokens(body)
      ? { kind: "ok", tokens: body.data }
      : { kind: "unavailable" };
  }

  // 401 or 403: REFRESH_REUSED, REFRESH_EXPIRED, INVALID_CREDENTIALS,
  // ACCOUNT_DISABLED, TENANT_SUSPENDED or PASSWORD_CHANGE_REQUIRED (step 5).
  // Any other 4xx also means this refresh token will never work.
  const reason = (reasonOf(body) ?? "INVALID_CREDENTIALS") as ErrorReason;
  return { kind: "ended", reason };
};

// Middleware and route handlers are separate bundles in one process. Keeping
// the map on globalThis gives them a single lock per session.
const IN_FLIGHT_KEY = Symbol.for("web-starter.session.refresh-in-flight");
const store = globalThis as typeof globalThis & {
  [IN_FLIGHT_KEY]?: InFlight;
};
store[IN_FLIGHT_KEY] ??= new Map<string, Promise<RefreshResult>>();

/** The process-wide single-flight refresh (TRD 5.3 step 3). */
export const refreshOnce: RefreshFn = createRefresher({
  fetchTokens: fetchRefresh,
  inFlight: store[IN_FLIGHT_KEY],
});
