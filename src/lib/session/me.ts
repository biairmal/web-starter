import "server-only";

import { headers } from "next/headers";
import { cache } from "react";
import { env } from "@/config/env";
import type { AuthConfig, Me } from "@/lib/api/types";
import { BffError } from "@/lib/bff/envelope";
import { newRequestId } from "@/lib/bff/request-id";
import { identityFetch } from "@/lib/session/identity-fetch";
import { getSession } from "@/lib/session/server";
import { type UpstreamCall, clientIp } from "@/lib/session/upstream";

// What Server Components load from identity for the signed-in shell (TRD 6.2).
// Each loader runs at most once per request (React `cache`).

/** The auth config changes rarely; identity is asked at most every 5 minutes. */
const AUTH_CONFIG_REVALIDATE_SECONDS = 300;

/** Upstream call details for the page request being rendered. */
async function currentCall(): Promise<UpstreamCall> {
  const list = await headers();
  const userAgent = list.get("user-agent") ?? undefined;
  const ip = clientIp(list);
  return {
    requestId: newRequestId(),
    ...(ip === undefined ? {} : { clientIp: ip }),
    ...(userAgent === undefined ? {} : { userAgent }),
  };
}

function dataOf(body: unknown): unknown {
  if (typeof body !== "object" || body === null || !("data" in body)) {
    throw new Error("identity returned a body without data");
  }
  return body.data;
}

/**
 * The signed-in user from `GET /v1/me`, or `null` when identity no longer
 * accepts the session. Middleware has already refreshed the access token, and
 * a Server Component cannot set cookies, so a rejected token is not retried
 * here. Throws `BffError` UPSTREAM_UNAVAILABLE when identity is down, and an
 * `Error` for any other failure, for the error boundary.
 */
export const getCurrentMe = cache(async (): Promise<Me | null> => {
  const session = await getSession();
  if (!session) {
    return null;
  }
  let response: Response;
  try {
    response = await identityFetch("/v1/me", { method: "GET" }, session, {
      call: await currentCall(),
    });
  } catch (error) {
    if (error instanceof BffError && error.reason === "SESSION_ENDED") {
      return null;
    }
    throw error;
  }
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`identity GET /v1/me answered ${String(response.status)}`);
  }
  return dataOf(await response.json()) as Me;
});

/**
 * `GET /v1/auth/config`, cached by Next.js for 5 minutes. Returns `null` when
 * identity cannot be reached; callers then treat the app as single-tenant.
 */
export const getAuthConfig = cache(async (): Promise<AuthConfig | null> => {
  try {
    const response = await fetch(
      `${env.IDENTITY_INTERNAL_URL.replace(/\/$/, "")}/v1/auth/config`,
      {
        next: { revalidate: AUTH_CONFIG_REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(5_000),
      },
    );
    return response.ok ? (dataOf(await response.json()) as AuthConfig) : null;
  } catch {
    return null;
  }
});
