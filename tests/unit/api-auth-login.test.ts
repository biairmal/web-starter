import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET as getConfig } from "@/app/api/auth/config/route";
import { POST } from "@/app/api/auth/login/route";
import { CSRF_HEADER, CSRF_HEADER_VALUE } from "@/lib/bff/csrf";
import { cookieNames, readSessionCookies } from "@/lib/session/cookies";
import { server } from "../msw/server";
import { fakeAccessToken, tokenResponse } from "../helpers/tokens";

// POST /api/auth/login (TRD 5.4, 7.2) against a fake identity.

const APP = "http://localhost:3000";
const IDENTITY = "http://identity.test";
const names = cookieNames();

function login(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new NextRequest(`${APP}/api/auth/login`, {
      method: "POST",
      headers: {
        origin: APP,
        [CSRF_HEADER]: CSRF_HEADER_VALUE,
        "content-type": "application/json",
        "user-agent": "TestBrowser/1.0",
        ...headers,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    {},
  );
}

function envelope(data: unknown) {
  return { timestamp: "2026-11-11T00:00:00Z", data };
}

/** The response's cookies as a reader, to open them like the BFF does. */
function setCookies(res: Response) {
  const values = new Map<string, string>();
  for (const line of res.headers.getSetCookie()) {
    const [pair] = line.split(";");
    const index = pair?.indexOf("=") ?? -1;
    if (pair && index > 0) {
      values.set(pair.slice(0, index), pair.slice(index + 1));
    }
  }
  return {
    values,
    reader: {
      get: (name: string) => {
        const value = values.get(name);
        return value ? { value } : undefined;
      },
    },
  };
}

const credentials = { email: "dina@example.com", password: "correct horse" };

describe("POST /api/auth/login", () => {
  it("FE-2 sets the session cookies and returns next, never a token", async () => {
    let sent: unknown;
    let userAgent: string | null = null;
    server.use(
      http.post(`${IDENTITY}/v1/auth/login`, async ({ request }) => {
        sent = await request.json();
        userAgent = request.headers.get("user-agent");
        return HttpResponse.json(envelope(tokenResponse()));
      }),
    );
    const res = await login({ ...credentials, next: "/admin/users?page=2" });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(sent).toEqual(credentials);
    expect(userAgent).toBe("TestBrowser/1.0");

    const text = await res.text();
    expect(JSON.parse(text)).toMatchObject({
      data: { next: "/admin/users?page=2" },
    });
    expect(text).not.toMatch(/token/i);

    const { values, reader } = setCookies(res);
    const session = await readSessionCookies(reader);
    expect(session.access?.token).toBe(fakeAccessToken());
    expect(session.refresh?.token).toBe("refresh-token-1");
    expect(values.get(names.restricted)).toBe("");
    for (const line of res.headers.getSetCookie()) {
      expect(line).toMatch(/HttpOnly/i);
      expect(line).toMatch(/Secure/i);
    }
  });

  it("replaces an unsafe next with /", async () => {
    server.use(
      http.post(`${IDENTITY}/v1/auth/login`, () =>
        HttpResponse.json(envelope(tokenResponse())),
      ),
    );
    const res = await login({ ...credentials, next: "//evil.example" });
    expect(await res.json()).toMatchObject({ data: { next: "/" } });
  });

  it("FE-8 returns the tenants to choose from and sets no cookie", async () => {
    const tenants = [
      {
        id: "00000000-0000-4000-8000-0000000000a1",
        slug: "acme",
        name: "Acme",
      },
      {
        id: "00000000-0000-4000-8000-0000000000a2",
        slug: "globex",
        name: "Globex",
      },
    ];
    server.use(
      http.post(`${IDENTITY}/v1/auth/login`, () =>
        HttpResponse.json(envelope({ tenant_required: true, tenants })),
      ),
    );
    const res = await login(credentials);
    expect(await res.json()).toMatchObject({
      data: { tenant_required: true, tenants },
    });
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("forwards the chosen tenant", async () => {
    let sent: unknown;
    server.use(
      http.post(`${IDENTITY}/v1/auth/login`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(envelope(tokenResponse()));
      }),
    );
    await login({ ...credentials, tenant: "globex" });
    expect(sent).toEqual({ ...credentials, tenant: "globex" });
  });

  it("FE-7 sets only the restricted cookie when a password change is forced", async () => {
    const restricted = fakeAccessToken({ scope: "password_change" });
    server.use(
      http.post(`${IDENTITY}/v1/auth/login`, () =>
        HttpResponse.json(
          envelope(
            tokenResponse(
              {},
              {
                access_token: restricted,
                must_change_password: true,
                refresh_token: undefined,
                refresh_expires_in: undefined,
              },
            ),
          ),
        ),
      ),
    );
    const res = await login({ ...credentials, next: "/admin/users" });
    expect(await res.json()).toMatchObject({
      data: { next: "/change-password" },
    });
    const { values, reader } = setCookies(res);
    const session = await readSessionCookies(reader);
    expect(session.restricted?.token).toBe(restricted);
    expect(session.restricted?.next).toBe("/admin/users");
    expect(values.get(names.access)).toBe("");
    expect(values.get(names.refresh)).toBe("");
  });

  it("passes identity's error envelope and Retry-After through unchanged", async () => {
    const body = {
      timestamp: "2026-11-11T00:00:00Z",
      error: {
        code: "ERR_UNAUTHORIZED",
        message: "unauthorized",
        meta: { reason: "ACCOUNT_LOCKED", retry_after: 840 },
      },
    };
    server.use(
      http.post(`${IDENTITY}/v1/auth/login`, () =>
        HttpResponse.json(body, {
          status: 401,
          headers: { "Retry-After": "840" },
        }),
      ),
    );
    const res = await login(credentials);
    expect(res.status).toBe(401);
    expect(res.headers.get("retry-after")).toBe("840");
    expect(res.headers.get("x-request-id")).toBeTruthy();
    expect(await res.json()).toEqual(body);
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("answers 503 UPSTREAM_UNAVAILABLE when identity fails", async () => {
    server.use(
      http.post(`${IDENTITY}/v1/auth/login`, () => HttpResponse.error()),
    );
    const res = await login(credentials);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      error: { meta: { reason: "UPSTREAM_UNAVAILABLE" } },
    });
  });

  it("rejects a request without the CSRF header", async () => {
    const res = await login(credentials, { [CSRF_HEADER]: "" });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({
      error: { meta: { reason: "CSRF_FAILED" } },
    });
  });

  it("rejects a body that is not JSON or misses a field", async () => {
    expect((await login("not json")).status).toBe(400);
    const res = await login({ email: "dina@example.com" });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: { meta: { fields: { password: "password is invalid" } } },
    });
  });
});

describe("GET /api/auth/config", () => {
  it("FE-1 returns identity's auth config", async () => {
    const res = await getConfig(new NextRequest(`${APP}/api/auth/config`), {});
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      data: {
        providers: { password: true, google: false },
        registration: true,
        tenancy: "single",
      },
    });
  });
});
