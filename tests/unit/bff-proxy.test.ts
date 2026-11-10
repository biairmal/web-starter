import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { identityAllowList } from "@/lib/bff/allowlist";
import { CSRF_HEADER, CSRF_HEADER_VALUE } from "@/lib/bff/csrf";
import { createServiceProxy } from "@/lib/bff/proxy";
import { cookieNames, sealSessionCookies } from "@/lib/session/cookies";
import type { RefreshFn } from "@/lib/session/identity-fetch";
import { server } from "../msw/server";
import { fakeAccessToken, tokenResponse } from "../helpers/tokens";

const APP = "http://localhost:3000";
const IDENTITY = "http://identity.test";
const names = cookieNames();

const ACCESS_1 = fakeAccessToken({ sid: "family-1", sub: "user-1" });
const ACCESS_2 = fakeAccessToken({ sid: "family-1", sub: "user-1", exp: 9e9 });

async function sessionCookie(): Promise<string> {
  const specs = await sealSessionCookies(
    tokenResponse({}, { access_token: ACCESS_1 }),
  );
  return specs
    .filter((spec) => spec.value)
    .map((spec) => `${spec.name}=${spec.value}`)
    .join("; ");
}

type Init = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

async function call(
  proxy: ReturnType<typeof createServiceProxy>,
  path: string[],
  init: Init = {},
  query = "",
) {
  const method = init.method ?? "GET";
  const headers: Record<string, string> = {
    cookie: await sessionCookie(),
    "user-agent": "TestBrowser/1.0",
    "x-forwarded-for": "203.0.113.7",
    ...(method === "GET"
      ? {}
      : { origin: APP, [CSRF_HEADER]: CSRF_HEADER_VALUE }),
    ...init.headers,
  };
  const request = new NextRequest(`${APP}/api/id/${path.join("/")}${query}`, {
    method,
    headers,
    ...(init.body === undefined ? {} : { body: init.body }),
  });
  const handler = proxy[method as keyof typeof proxy];
  return handler(request, { params: Promise.resolve({ path }) });
}

function identityProxy(refresh?: RefreshFn) {
  return createServiceProxy({
    prefix: "/v1",
    baseUrl: () => IDENTITY,
    allow: identityAllowList,
    ...(refresh ? { refresh } : {}),
  });
}

const page = {
  items: [],
  total: 0,
  page: 2,
  size: 20,
  total_pages: 0,
  has_prev: true,
  has_next: false,
};

describe("identity proxy", () => {
  it("forwards an allowed GET with bearer, request ID, client IP, user agent and query", async () => {
    let seen: Request | undefined;
    server.use(
      http.get(`${IDENTITY}/v1/admin/users`, ({ request }) => {
        seen = request;
        return HttpResponse.json(
          { timestamp: "t", data: page },
          { headers: { etag: '"3"' } },
        );
      }),
    );
    const res = await call(
      identityProxy(),
      ["admin", "users"],
      {},
      "?page=2&q=a%20b",
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ timestamp: "t", data: page });
    expect(res.headers.get("etag")).toBe('"3"');
    expect(res.headers.get("cache-control")).toBe("no-store");

    expect(seen).toBeDefined();
    const url = new URL(seen?.url ?? "");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("q")).toBe("a b");
    expect(seen?.headers.get("authorization")).toBe(`Bearer ${ACCESS_1}`);
    expect(seen?.headers.get("x-request-id")).toBe(
      res.headers.get("x-request-id"),
    );
    expect(seen?.headers.get("x-forwarded-for")).toBe("203.0.113.7");
    expect(seen?.headers.get("user-agent")).toBe("TestBrowser/1.0");
    // The browser's cookies never go upstream.
    expect(seen?.headers.get("cookie")).toBeNull();
  });

  it.each([
    [["internal", "users", "x"]],
    [["auth", "refresh"]],
    [["auth", "login"]],
    [["me", "password"]],
    [[".well-known", "jwks.json"]],
    [["admin"]],
    [["admin", "permissions", "extra"]],
    [["admin", "users", "..", "..", "internal"]],
    [["me", "..%2F..%2Finternal"]],
    [["admin", "users", "a/b"]],
  ])(
    "answers 404 NOT_ALLOWED for /api/id/%j without calling identity",
    async (path) => {
      const res = await call(identityProxy(), path);
      expect(res.status).toBe(404);
      const body = (await res.json()) as {
        error: { meta: { reason: string } };
      };
      expect(body.error.meta.reason).toBe("NOT_ALLOWED");
    },
  );

  it.each([
    [["me"]],
    [["me", "sessions"]],
    [["admin", "roles", "r1", "permissions"]],
    [["admin", "audit"]],
    [["admin", "tenants", "t1"]],
    [["admin", "role-templates"]],
  ])("allows /api/id/%j", async (path) => {
    server.use(
      http.get(`${IDENTITY}/v1/*`, () =>
        HttpResponse.json({ timestamp: "t", data: {} }),
      ),
    );
    expect((await call(identityProxy(), path)).status).toBe(200);
  });

  it("forwards method, body, Content-Type and If-Match on a PATCH", async () => {
    let seen:
      | {
          method: string;
          body: string;
          ifMatch: string | null;
          type: string | null;
        }
      | undefined;
    server.use(
      http.patch(`${IDENTITY}/v1/admin/roles/r1`, async ({ request }) => {
        seen = {
          method: request.method,
          body: await request.text(),
          ifMatch: request.headers.get("if-match"),
          type: request.headers.get("content-type"),
        };
        return HttpResponse.json({ timestamp: "t", data: { id: "r1" } });
      }),
    );
    const res = await call(identityProxy(), ["admin", "roles", "r1"], {
      method: "PATCH",
      headers: { "content-type": "application/json", "if-match": '"7"' },
      body: JSON.stringify({ name: "Editors" }),
    });
    expect(res.status).toBe(200);
    expect(seen).toEqual({
      method: "PATCH",
      body: '{"name":"Editors"}',
      ifMatch: '"7"',
      type: "application/json",
    });
  });

  it("returns the identity error envelope and status unchanged", async () => {
    const envelope = {
      timestamp: "t",
      error: {
        code: "ERR_CONFLICT",
        message: "conflict",
        meta: { reason: "VERSION_CONFLICT" },
      },
    };
    server.use(
      http.put(`${IDENTITY}/v1/admin/roles/r1/permissions`, () =>
        HttpResponse.json(envelope, { status: 409 }),
      ),
    );
    const res = await call(
      identityProxy(),
      ["admin", "roles", "r1", "permissions"],
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: "[]",
      },
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual(envelope);
  });

  it("refuses a mutating request that fails the CSRF check", async () => {
    const res = await call(identityProxy(), ["me"], {
      method: "PATCH",
      headers: { [CSRF_HEADER]: "" },
      body: "{}",
    });
    expect(res.status).toBe(403);
  });

  it("answers 401 SESSION_ENDED without a session", async () => {
    const res = await call(identityProxy(), ["me"], {
      headers: { cookie: "" },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as {
      error: { meta: Record<string, string> };
    };
    expect(body.error.meta).toEqual({
      reason: "SESSION_ENDED",
      cause: "NO_SESSION",
    });
  });

  it("answers 503 UPSTREAM_UNAVAILABLE when identity cannot be reached", async () => {
    server.use(http.get(`${IDENTITY}/v1/me`, () => HttpResponse.error()));
    const res = await call(identityProxy(), ["me"]);
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: { meta: { reason: string } } };
    expect(body.error.meta.reason).toBe("UPSTREAM_UNAVAILABLE");
  });
});

describe("401 retry", () => {
  const unauthorized = () =>
    HttpResponse.json(
      {
        timestamp: "t",
        error: { code: "ERR_UNAUTHORIZED", message: "unauthorized" },
      },
      { status: 401 },
    );

  it("refreshes once and retries once after a 401 with no reason, then sets the new cookies", async () => {
    const tokens: string[] = [];
    server.use(
      http.get(`${IDENTITY}/v1/me`, ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        tokens.push(auth);
        return auth === `Bearer ${ACCESS_2}`
          ? HttpResponse.json({ timestamp: "t", data: { id: "user-1" } })
          : unauthorized();
      }),
    );
    const refresh = vi.fn<RefreshFn>(() =>
      Promise.resolve({
        kind: "ok",
        tokens: tokenResponse(
          {},
          { access_token: ACCESS_2, refresh_token: "refresh-token-2" },
        ),
      }),
    );
    const res = await call(identityProxy(refresh), ["me"]);
    expect(res.status).toBe(200);
    expect(tokens).toEqual([`Bearer ${ACCESS_1}`, `Bearer ${ACCESS_2}`]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh.mock.calls[0]?.[0]).toBe("family-1");
    expect(refresh.mock.calls[0]?.[1]).toBe("refresh-token-1");
    const setCookies = res.headers.getSetCookie().join("\n");
    expect(setCookies).toMatch(new RegExp(`${names.access}=[^;]+`));
    expect(setCookies).toMatch(new RegExp(`${names.refresh}=[^;]+`));
  });

  it("re-sends the body on the retry", async () => {
    const bodies: string[] = [];
    server.use(
      http.post(`${IDENTITY}/v1/admin/users`, async ({ request }) => {
        bodies.push(await request.text());
        return bodies.length === 1
          ? unauthorized()
          : HttpResponse.json({ timestamp: "t", data: {} }, { status: 201 });
      }),
    );
    const refresh: RefreshFn = () =>
      Promise.resolve({
        kind: "ok",
        tokens: tokenResponse({}, { access_token: ACCESS_2 }),
      });
    const res = await call(identityProxy(refresh), ["admin", "users"], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"email":"x@example.com"}',
    });
    expect(res.status).toBe(201);
    expect(bodies).toEqual([
      '{"email":"x@example.com"}',
      '{"email":"x@example.com"}',
    ]);
  });

  it("ends the session when the retry is also a 401 with no reason", async () => {
    server.use(http.get(`${IDENTITY}/v1/me`, unauthorized));
    const refresh: RefreshFn = () =>
      Promise.resolve({
        kind: "ok",
        tokens: tokenResponse({}, { access_token: ACCESS_2 }),
      });
    const res = await call(identityProxy(refresh), ["me"]);
    expect(res.status).toBe(401);
    const body = (await res.json()) as {
      error: { meta: Record<string, string> };
    };
    expect(body.error.meta.reason).toBe("SESSION_ENDED");
    expect(res.headers.getSetCookie().join("\n")).toContain(
      `${names.refresh}=;`,
    );
  });

  it("ends the session with identity's reason when the refresh is refused", async () => {
    server.use(http.get(`${IDENTITY}/v1/me`, unauthorized));
    const refresh: RefreshFn = () =>
      Promise.resolve({ kind: "ended", reason: "REFRESH_REUSED" });
    const res = await call(identityProxy(refresh), ["me"]);
    expect(res.status).toBe(401);
    const body = (await res.json()) as {
      error: { meta: Record<string, string> };
    };
    expect(body.error.meta).toEqual({
      reason: "SESSION_ENDED",
      cause: "REFRESH_REUSED",
    });
  });

  it("answers 503 and keeps the cookies when the refresh cannot reach identity", async () => {
    server.use(http.get(`${IDENTITY}/v1/me`, unauthorized));
    const refresh: RefreshFn = () => Promise.resolve({ kind: "unavailable" });
    const res = await call(identityProxy(refresh), ["me"]);
    expect(res.status).toBe(503);
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("returns a 401 that carries a reason unchanged, without refreshing", async () => {
    const envelope = {
      timestamp: "t",
      error: {
        code: "ERR_UNAUTHORIZED",
        message: "wrong password",
        meta: { reason: "INVALID_CREDENTIALS" },
      },
    };
    server.use(
      http.get(`${IDENTITY}/v1/me/sessions`, () =>
        HttpResponse.json(envelope, { status: 401 }),
      ),
    );
    const refresh = vi.fn<RefreshFn>();
    const res = await call(identityProxy(refresh), ["me", "sessions"]);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual(envelope);
    expect(refresh).not.toHaveBeenCalled();
    expect(res.headers.getSetCookie()).toEqual([]);
  });
});
