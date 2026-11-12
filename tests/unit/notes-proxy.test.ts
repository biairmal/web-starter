import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type * as NotesRoute from "@/app/api/notes/[...path]/route";
import { CSRF_HEADER, CSRF_HEADER_VALUE } from "@/lib/bff/csrf";
import { sealSessionCookies } from "@/lib/session/cookies";
import { server } from "../msw/server";
import { fakeAccessToken, tokenResponse } from "../helpers/tokens";

// The example module's proxy route (FE-62; TRD 7.4): /api/notes/<path> goes
// to NOTES_INTERNAL_URL/v1/<path> with the session's bearer token.

const APP = "http://localhost:3000";
const NOTES = "http://notes.test";
const ACCESS = fakeAccessToken({ sid: "family-1", sub: "user-1" });

async function cookie(): Promise<string> {
  const specs = await sealSessionCookies(
    tokenResponse({}, { access_token: ACCESS }),
  );
  return specs
    .filter((spec) => spec.value)
    .map((spec) => `${spec.name}=${spec.value}`)
    .join("; ");
}

type Route = typeof NotesRoute;

async function call(
  route: Route,
  path: string[],
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {},
) {
  const method = init.method ?? "GET";
  const request = new NextRequest(`${APP}/api/notes/${path.join("/")}`, {
    method,
    headers: {
      cookie: await cookie(),
      ...(method === "GET"
        ? {}
        : { origin: APP, [CSRF_HEADER]: CSRF_HEADER_VALUE }),
      ...init.headers,
    },
    ...(init.body === undefined ? {} : { body: init.body }),
  });
  return route[method as "GET"](request, {
    params: Promise.resolve({ path }),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("notes proxy", () => {
  it("FE-62 forwards /api/notes/notes to the service's /v1/notes with the bearer token", async () => {
    let seen: Request | undefined;
    server.use(
      http.get(`${NOTES}/v1/notes`, ({ request }) => {
        seen = request;
        return HttpResponse.json({ data: { items: [], total: 0 } });
      }),
    );
    const route = await import("@/app/api/notes/[...path]/route");
    const response = await call(route, ["notes"]);
    expect(response.status).toBe(200);
    expect(seen?.headers.get("authorization")).toBe(`Bearer ${ACCESS}`);
  });

  it("FE-62 forwards a PATCH with If-Match", async () => {
    let ifMatch: string | null = null;
    server.use(
      http.patch(`${NOTES}/v1/notes/n1`, ({ request }) => {
        ifMatch = request.headers.get("if-match");
        return HttpResponse.json({ data: { id: "n1", version: 4 } });
      }),
    );
    const route = await import("@/app/api/notes/[...path]/route");
    const response = await call(route, ["notes", "n1"], {
      method: "PATCH",
      headers: { "content-type": "application/json", "if-match": '"3"' },
      body: JSON.stringify({ pinned: true }),
    });
    expect(response.status).toBe(200);
    expect(ifMatch).toBe('"3"');
  });

  it("refuses paths outside the allow-list with 404 NOT_ALLOWED", async () => {
    const route = await import("@/app/api/notes/[...path]/route");
    const response = await call(route, ["internal", "notes"]);
    expect(response.status).toBe(404);
    const body = (await response.json()) as {
      error: { meta: { reason: string } };
    };
    expect(body.error.meta.reason).toBe("NOT_ALLOWED");
  });

  it("answers 503 UPSTREAM_UNAVAILABLE when NOTES_INTERNAL_URL is not set", async () => {
    vi.stubEnv("NOTES_INTERNAL_URL", undefined);
    vi.resetModules();
    const route = await import("@/app/api/notes/[...path]/route");
    const response = await call(route, ["notes"]);
    expect(response.status).toBe(503);
    const body = (await response.json()) as {
      error: { meta: { reason: string } };
    };
    expect(body.error.meta.reason).toBe("UPSTREAM_UNAVAILABLE");
  });
});
