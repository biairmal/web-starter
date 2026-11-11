import "server-only";

import { NextResponse } from "next/server";
import type { z } from "zod";
import { env } from "@/config/env";
import { BffError } from "@/lib/bff/envelope";
import { readLimitedBody } from "@/lib/bff/route";
import { type UpstreamCall, upstreamHeaders } from "@/lib/session/upstream";

// Calls to identity's public auth endpoints, made without a bearer token
// (TRD 7.2, 7.3), and the request-body parsing the session routes share.

/** Public auth calls that take longer than this fail as UPSTREAM_UNAVAILABLE. */
const PUBLIC_TIMEOUT_MS = 10_000;

/** Response headers copied when an identity answer is passed to the browser. */
const PASSED_HEADERS = ["content-type", "retry-after"] as const;

/**
 * `POST` (or another method) to an identity path such as `/v1/auth/login`,
 * with the request ID, client IP and user agent of the browser request.
 * Throws `BffError` UPSTREAM_UNAVAILABLE when identity cannot be reached.
 */
export async function callIdentity(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
  call: UpstreamCall,
): Promise<Response> {
  const headers = upstreamHeaders(call, { Accept: "application/json" });
  if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  try {
    return await fetch(
      `${env.IDENTITY_INTERNAL_URL.replace(/\/$/, "")}${path}`,
      {
        method: init.method,
        headers,
        ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(PUBLIC_TIMEOUT_MS),
      },
    );
  } catch {
    throw BffError.upstreamUnavailable();
  }
}

/**
 * Passes an identity response to the browser unchanged: status, envelope and
 * `Retry-After`. Identity's 5xx become UPSTREAM_UNAVAILABLE, so the browser
 * never sees an upstream stack's own error text.
 */
export async function passThrough(response: Response): Promise<Response> {
  if (response.status >= 500) {
    throw BffError.upstreamUnavailable();
  }
  const headers = new Headers();
  for (const name of PASSED_HEADERS) {
    const value = response.headers.get(name);
    if (value !== null) {
      headers.set(name, value);
    }
  }
  const body = response.status === 204 ? null : await response.text();
  return new Response(body, { status: response.status, headers });
}

/** The `data` of a success envelope, or `undefined`. */
export async function readData(response: Response): Promise<unknown> {
  try {
    const body: unknown = await response.json();
    return typeof body === "object" && body !== null && "data" in body
      ? body.data
      : undefined;
  } catch {
    return undefined;
  }
}

/** A success envelope with `data`, as identity sends it. */
export function dataResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json(
    { timestamp: new Date().toISOString(), data },
    { status },
  );
}

/**
 * Reads and validates a JSON request body against `schema`. A body that is
 * not JSON or does not match is a 400, with the failing fields in
 * `meta.fields` as identity reports them.
 */
export async function readJsonBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.output<S>> {
  const bytes = await readLimitedBody(request);
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes ?? new Uint8Array()));
  } catch {
    throw BffError.badRequest();
  }
  const result = schema.safeParse(value);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const name = issue.path.map(String).join(".");
      if (name && !(name in fields)) {
        fields[name] = `${name} is invalid`;
      }
    }
    throw BffError.badRequest(fields);
  }
  return result.data;
}
