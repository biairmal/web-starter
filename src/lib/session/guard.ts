import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/config/env";
import { BffError, type SessionEndCause, errorBody } from "@/lib/bff/envelope";
import { REQUEST_ID_HEADER, newRequestId } from "@/lib/bff/request-id";
import {
  type CookieSpec,
  applyCookies,
  clearedSessionCookies,
  readSessionCookies,
  sealSessionCookies,
} from "@/lib/session/cookies";
import { refreshOnce } from "@/lib/session/refresh";
import {
  CHANGE_PASSWORD_PATH,
  SIGN_IN_PATH,
  isApiPath,
  isPublic,
  isRestrictedAllowed,
  isSignedOutOnly,
} from "@/lib/session/route-rules";
import { type RefreshFn, callFor } from "@/lib/session/upstream";

// The request guard run by middleware on every page and /api request
// (APP_FLOW 3, TRD 5.3, 5.7, 6.2). Permission checks happen later, in pages.

/** Refresh when the access token expires within this many seconds. */
export const REFRESH_AHEAD_SECONDS = 60;

/** Seconds a browser should wait before retrying while identity is down. */
const RETRY_AFTER_SECONDS = 5;

export type GuardDeps = {
  refresh?: RefreshFn;
  /** Unix seconds. */
  now?: () => number;
};

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function appUrl(path: string): URL {
  return new URL(path, env.APP_URL);
}

function currentPath(request: NextRequest): string {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

function redirect(
  path: string,
  cookies: readonly CookieSpec[] = [],
): NextResponse {
  const response = NextResponse.redirect(appUrl(path), 307);
  applyCookies(response.cookies, cookies);
  return response;
}

function apiError(
  error: BffError,
  cookies: readonly CookieSpec[] = [],
): NextResponse {
  const response = NextResponse.json(errorBody(error), {
    status: error.status,
  });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set(REQUEST_ID_HEADER, newRequestId());
  applyCookies(response.cookies, cookies);
  return response;
}

/** Continue to the page or route, with new cookies on both request and response. */
function proceed(
  request: NextRequest,
  cookies: readonly CookieSpec[] = [],
): NextResponse {
  for (const spec of cookies) {
    if (spec.options.maxAge === 0) {
      request.cookies.delete(spec.name);
    } else {
      request.cookies.set(spec.name, spec.value);
    }
  }
  const response = NextResponse.next({ request: { headers: request.headers } });
  applyCookies(response.cookies, cookies);
  return response;
}

/**
 * The session is over: cookies are cleared, pages go to sign-in with the
 * reason and the path to return to, and API calls get 401 SESSION_ENDED.
 */
function sessionEnded(
  request: NextRequest,
  cause: SessionEndCause,
): NextResponse {
  const cleared = clearedSessionCookies();
  if (isApiPath(request.nextUrl.pathname)) {
    return apiError(BffError.sessionEnded(cause), cleared);
  }
  const target = new URLSearchParams();
  if (cause !== "NO_SESSION") {
    target.set("reason", cause);
  }
  target.set("next", currentPath(request));
  return redirect(`${SIGN_IN_PATH}?${target.toString()}`, cleared);
}

function unavailable(request: NextRequest): NextResponse {
  if (isApiPath(request.nextUrl.pathname)) {
    const response = apiError(BffError.upstreamUnavailable());
    response.headers.set("Retry-After", String(RETRY_AFTER_SECONDS));
    return response;
  }
  return new NextResponse("Service unavailable. Try again in a few seconds.", {
    status: 503,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "Retry-After": String(RETRY_AFTER_SECONDS),
    },
  });
}

export async function guardRequest(
  request: NextRequest,
  deps: GuardDeps = {},
): Promise<NextResponse> {
  const path = request.nextUrl.pathname;
  const now = (deps.now ?? nowSeconds)();
  const cookies = await readSessionCookies(request.cookies);
  const signedIn = cookies.refresh !== null;

  if (isPublic(path)) {
    return signedIn && isSignedOutOnly(path) ? redirect("/") : proceed(request);
  }

  // Only the restricted cookie: confined to the password change (TRD 5.7).
  if (cookies.restricted && !signedIn) {
    if (isRestrictedAllowed(path)) {
      return proceed(request);
    }
    return isApiPath(path)
      ? apiError(
          new BffError(403, "ERR_FORBIDDEN", "A password change is required.", {
            reason: "PASSWORD_CHANGE_REQUIRED",
          }),
        )
      : redirect(CHANGE_PASSWORD_PATH);
  }

  if (!cookies.refresh) {
    return sessionEnded(request, "NO_SESSION");
  }
  if (cookies.refresh.refreshExpiresAt <= now) {
    return sessionEnded(request, "REFRESH_EXPIRED");
  }

  const access = cookies.access;
  if (access && access.exp - now > REFRESH_AHEAD_SECONDS) {
    return proceed(request);
  }

  const refresh = deps.refresh ?? refreshOnce;
  const result = await refresh(
    cookies.refresh.sessionId,
    cookies.refresh.token,
    callFor(request, newRequestId()),
  );

  if (result.kind === "ok") {
    return proceed(request, await sealSessionCookies(result.tokens));
  }
  if (result.kind === "ended") {
    return sessionEnded(request, result.reason);
  }
  // Identity is down: carry on with the old access token while it is valid.
  return access && access.exp > now ? proceed(request) : unavailable(request);
}
