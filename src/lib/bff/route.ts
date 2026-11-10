import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/config/env";
import { assertCsrf } from "@/lib/bff/csrf";
import { BffError, errorResponse } from "@/lib/bff/envelope";
import { REQUEST_ID_HEADER, newRequestId } from "@/lib/bff/request-id";
import {
  type CookieOptions,
  type CookieSpec,
  type CookieWriter,
  applyCookies,
  clearedSessionCookies,
} from "@/lib/session/cookies";
import { type Session, sessionFrom } from "@/lib/session/server";

// Conventions shared by every BFF route handler (TRD 7.1).

/** Same limit as identity. */
export const BODY_LIMIT_BYTES = 1024 * 1024;

export type SessionMode = "required" | "optional" | "none";

export type BffOptions<M extends SessionMode> = {
  /** Enforce the Origin and custom-header check on non-GET requests. */
  csrf: boolean;
  session: M;
};

type SessionFor<M extends SessionMode> = M extends "required"
  ? Session
  : M extends "optional"
    ? Session | null
    : null;

/** Collects cookies a handler sets; `withBff` puts them on the response. */
export class CookieJar implements CookieWriter {
  readonly specs: CookieSpec[] = [];

  set(name: string, value: string, options: CookieOptions): void {
    this.specs.push({ name, value, options });
  }
}

export type BffContext<M extends SessionMode> = {
  request: NextRequest;
  requestId: string;
  session: SessionFor<M>;
  cookies: CookieJar;
};

export type BffHandler<M extends SessionMode, R> = (
  ctx: BffContext<M>,
  routeContext: R,
) => Promise<Response>;

/**
 * Wraps a route handler with the BFF conventions: a new `X-Request-Id`, the
 * CSRF check, the 1 MiB body limit, the session lookup, `Cache-Control:
 * no-store`, errors as the envelope, and one JSON log line per request.
 * A `SESSION_ENDED` error also clears the session cookies.
 */
export function withBff<M extends SessionMode, R = unknown>(
  handler: BffHandler<M, R>,
  options: BffOptions<M>,
): (request: NextRequest, routeContext: R) => Promise<NextResponse> {
  return async (request, routeContext) => {
    const started = performance.now();
    const requestId = newRequestId();
    const cookies = new CookieJar();
    let response: Response;
    let failure: BffError | undefined;

    try {
      if (options.csrf) {
        assertCsrf(request);
      }
      assertContentLength(request);
      const session = await loadSession(request, options.session);
      response = await handler(
        { request, requestId, session: session as SessionFor<M>, cookies },
        routeContext,
      );
    } catch (error) {
      failure = error instanceof BffError ? error : BffError.internal();
      if (!(error instanceof BffError)) {
        log("error", {
          msg: "bff handler failed",
          request_id: requestId,
          error: error instanceof Error ? error.name : "unknown",
        });
      }
      response = errorResponse(failure);
    }

    const result = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    result.headers.set("Cache-Control", "no-store");
    result.headers.set(REQUEST_ID_HEADER, requestId);
    applyCookies(result.cookies, cookies.specs);
    if (failure?.reason === "SESSION_ENDED") {
      applyCookies(result.cookies, clearedSessionCookies());
    }

    log("info", {
      msg: "bff request",
      request_id: requestId,
      method: request.method,
      route: request.nextUrl.pathname,
      status: result.status,
      duration_ms: Math.round(performance.now() - started),
    });
    return result;
  };
}

async function loadSession(
  request: NextRequest,
  mode: SessionMode,
): Promise<Session | null> {
  if (mode === "none") {
    return null;
  }
  const session = await sessionFrom(request.cookies);
  if (!session && mode === "required") {
    throw BffError.sessionEnded("NO_SESSION");
  }
  return session;
}

function assertContentLength(request: Request): void {
  const header = request.headers.get("content-length");
  if (header !== null && Number(header) > BODY_LIMIT_BYTES) {
    throw BffError.payloadTooLarge();
  }
}

/**
 * Reads the request body, stopping with a 413 once it passes the limit. Needed
 * on top of the Content-Length check because a chunked body has no length.
 * Returns `undefined` for a request without a body.
 */
export async function readLimitedBody(
  request: Request,
  limit: number = BODY_LIMIT_BYTES,
): Promise<Uint8Array | undefined> {
  if (!request.body) {
    return undefined;
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw BffError.payloadTooLarge();
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

const LEVELS = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
type Level = (typeof LEVELS)[number];

/**
 * One JSON line on stdout. Callers pass only method, route, status, timing and
 * IDs: never bodies, tokens, cookies or emails (TRD 11.1).
 */
export function log(
  level: Level,
  fields: Record<string, string | number>,
): void {
  if (env.LOG_LEVEL === "silent") {
    return;
  }
  if (LEVELS.indexOf(level) < LEVELS.indexOf(env.LOG_LEVEL)) {
    return;
  }
  console.log(
    JSON.stringify({ time: new Date().toISOString(), level, ...fields }),
  );
}
