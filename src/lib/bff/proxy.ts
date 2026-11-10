import "server-only";

import type { NextRequest } from "next/server";
import { type AllowList, cleanSegments, isAllowed } from "@/lib/bff/allowlist";
import { BffError } from "@/lib/bff/envelope";
import { readLimitedBody, withBff } from "@/lib/bff/route";
import {
  type RefreshFn,
  authorizedFetch,
  callFor,
} from "@/lib/session/identity-fetch";

// The authenticated proxy (TRD 7.4): one catch-all route per upstream
// service, limited by an allow-list. Identity uses it at /api/id/*; business
// modules add their own, for example /api/notes/* (FE-62).

export type ServiceProxyOptions = {
  /** Upstream path prefix, such as "/v1". */
  prefix: string;
  /** Upstream origin. A function, so env is read per request, not at import. */
  baseUrl: () => string;
  allow: AllowList;
  /** Replaces the default refresh, for tests. */
  refresh?: RefreshFn;
};

/** Route context Next.js passes to an `app/api/<name>/[...path]/route.ts`. */
export type CatchAllContext = { params: Promise<{ path: string[] }> };

/** Request headers passed upstream. Cookies and anything else stay behind. */
const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "content-type",
  "if-match",
  "if-none-match",
];

/** Response headers passed back. Encoding and length are recomputed. */
const FORWARDED_RESPONSE_HEADERS = ["content-type", "etag", "retry-after"];

const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function pick(source: Headers, names: readonly string[]): Headers {
  const picked = new Headers();
  for (const name of names) {
    const value = source.get(name);
    if (value !== null) {
      picked.set(name, value);
    }
  }
  return picked;
}

function upstreamUrl(
  options: ServiceProxyOptions,
  segments: readonly string[],
  request: NextRequest,
): string {
  const base = options.baseUrl().replace(/\/$/, "");
  const path = segments.map((segment) => encodeURIComponent(segment)).join("/");
  return `${base}${options.prefix}/${path}${request.nextUrl.search}`;
}

/**
 * Route handlers for GET, POST, PUT, PATCH and DELETE that forward allowed
 * paths with the session's bearer token, method, query, body and `If-Match`,
 * and return the upstream status and envelope unchanged.
 */
export function createServiceProxy(options: ServiceProxyOptions) {
  const handler = withBff<"required", CatchAllContext>(
    async (ctx, { params }) => {
      const { path } = await params;
      const segments = cleanSegments(path);
      if (!segments || !isAllowed(segments, options.allow)) {
        throw BffError.notAllowed();
      }
      const { request } = ctx;
      const body = METHODS_WITH_BODY.has(request.method)
        ? await readLimitedBody(request)
        : undefined;
      const upstream = await authorizedFetch(
        upstreamUrl(options, segments, request),
        {
          method: request.method,
          headers: pick(request.headers, FORWARDED_REQUEST_HEADERS),
          ...(body === undefined || body.byteLength === 0 ? {} : { body }),
        },
        ctx.session,
        {
          call: callFor(request, ctx.requestId),
          cookies: ctx.cookies,
          ...(options.refresh ? { refresh: options.refresh } : {}),
        },
      );
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: pick(upstream.headers, FORWARDED_RESPONSE_HEADERS),
      });
    },
    { csrf: true, session: "required" },
  );
  return {
    GET: handler,
    POST: handler,
    PUT: handler,
    PATCH: handler,
    DELETE: handler,
  };
}
