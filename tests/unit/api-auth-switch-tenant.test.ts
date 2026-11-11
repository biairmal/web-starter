import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST as switchTenant } from "@/app/api/auth/switch-tenant/route";
import { CSRF_HEADER, CSRF_HEADER_VALUE } from "@/lib/bff/csrf";
import {
  type CookieSpec,
  readSessionCookies,
  sealSessionCookies,
} from "@/lib/session/cookies";
import { server } from "../msw/server";
import { fakeAccessToken, tokenResponse } from "../helpers/tokens";

// Tenant switch (TRD 5.8, 7.2; FE-31).

const APP = "http://localhost:3000";
const IDENTITY = "http://identity.test";
const ACME = "00000000-0000-4000-8000-0000000000a1";

function cookieHeader(specs: CookieSpec[]): string {
  return specs
    .filter((spec) => spec.value)
    .map((spec) => `${spec.name}=${spec.value}`)
    .join("; ");
}

function post(
  body: unknown,
  cookies: CookieSpec[] = [],
  headers: Record<string, string> = {
    origin: APP,
    [CSRF_HEADER]: CSRF_HEADER_VALUE,
  },
) {
  return switchTenant(
    new NextRequest(`${APP}/api/auth/switch-tenant`, {
      method: "POST",
      headers: {
        ...headers,
        "content-type": "application/json",
        cookie: cookieHeader(cookies),
      },
      body: JSON.stringify(body),
    }),
    {},
  );
}

function cookieReader(res: Response) {
  const values = new Map<string, string>();
  for (const line of res.headers.getSetCookie()) {
    const [pair] = line.split(";");
    const index = pair?.indexOf("=") ?? -1;
    if (pair && index > 0) {
      values.set(pair.slice(0, index), pair.slice(index + 1));
    }
  }
  return {
    get: (name: string) => {
      const value = values.get(name);
      return value ? { value } : undefined;
    },
  };
}

function errorBody(reason: string) {
  return { error: { code: "ERR_FORBIDDEN", message: "x", meta: { reason } } };
}

const ACME_SESSION = tokenResponse(
  { tid: ACME, sid: "family-acme" },
  {
    access_token: fakeAccessToken({ tid: ACME, sid: "family-acme" }),
    refresh_token: "refresh-acme",
  },
);

describe("POST /api/auth/switch-tenant", () => {
  it("FE-31 calls identity with the session and replaces both cookies, then answers next /", async () => {
    let bearer: string | null = null;
    let sent: unknown;
    server.use(
      http.post(`${IDENTITY}/v1/auth/switch-tenant`, async ({ request }) => {
        bearer = request.headers.get("authorization");
        sent = await request.json();
        return HttpResponse.json({ data: ACME_SESSION });
      }),
    );
    const current = tokenResponse();
    const res = await post(
      { tenant_id: ACME },
      await sealSessionCookies(current),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ data: { next: "/" } });
    expect(bearer).toBe(`Bearer ${current.access_token}`);
    expect(sent).toEqual({ tenant_id: ACME });
    expect(res.headers.get("cache-control")).toBe("no-store");

    const session = await readSessionCookies(cookieReader(res));
    expect(session.access?.token).toBe(ACME_SESSION.access_token);
    expect(session.refresh?.token).toBe("refresh-acme");
    expect(session.refresh?.sessionId).toBe("family-acme");
  });

  it.each(["TENANT_SUSPENDED", "NOT_A_MEMBER"])(
    "FE-31 passes %s through and keeps the current cookies",
    async (reason) => {
      server.use(
        http.post(`${IDENTITY}/v1/auth/switch-tenant`, () =>
          HttpResponse.json(errorBody(reason), { status: 403 }),
        ),
      );
      const res = await post(
        { tenant_id: ACME },
        await sealSessionCookies(tokenResponse()),
      );
      expect(res.status).toBe(403);
      expect(await res.json()).toMatchObject({
        error: { meta: { reason } },
      });
      expect(res.headers.getSetCookie()).toEqual([]);
    },
  );

  it("passes identity's 404 in single mode through", async () => {
    server.use(
      http.post(`${IDENTITY}/v1/auth/switch-tenant`, () =>
        HttpResponse.json(
          { error: { code: "ERR_NOT_FOUND", message: "not found" } },
          { status: 404 },
        ),
      ),
    );
    const res = await post(
      { tenant_id: ACME },
      await sealSessionCookies(tokenResponse()),
    );
    expect(res.status).toBe(404);
  });

  it("ends the session without cookies", async () => {
    const res = await post({ tenant_id: ACME });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({
      error: { meta: { reason: "SESSION_ENDED" } },
    });
  });

  it("refuses a body without a tenant ID before calling identity", async () => {
    let called = false;
    server.use(
      http.post(`${IDENTITY}/v1/auth/switch-tenant`, () => {
        called = true;
        return HttpResponse.json({ data: ACME_SESSION });
      }),
    );
    const res = await post(
      { tenant_id: "acme" },
      await sealSessionCookies(tokenResponse()),
    );
    expect(res.status).toBe(400);
    expect(called).toBe(false);
  });

  it("refuses a cross-site request", async () => {
    const res = await post(
      { tenant_id: ACME },
      await sealSessionCookies(tokenResponse()),
      { origin: "https://evil.example" },
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({
      error: { meta: { reason: "CSRF_FAILED" } },
    });
  });
});
