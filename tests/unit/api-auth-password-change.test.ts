import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST as logoutAll } from "@/app/api/auth/logout-all/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { POST as change } from "@/app/api/auth/password/change/route";
import { CSRF_HEADER, CSRF_HEADER_VALUE } from "@/lib/bff/csrf";
import {
  type CookieSpec,
  cookieNames,
  readSessionCookies,
  sealRestrictedCookie,
  sealSessionCookies,
} from "@/lib/session/cookies";
import { server } from "../msw/server";
import { fakeAccessToken, nowSeconds, tokenResponse } from "../helpers/tokens";

// Password change (TRD 5.7, decision 13) and sign-out (TRD 5.4).

const APP = "http://localhost:3000";
const IDENTITY = "http://identity.test";
const names = cookieNames();

type Route = (request: NextRequest, context: unknown) => Promise<Response>;

function cookieHeader(specs: CookieSpec[]): string {
  return specs
    .filter((spec) => spec.value)
    .map((spec) => `${spec.name}=${spec.value}`)
    .join("; ");
}

function post(
  route: Route,
  path: string,
  body: unknown,
  cookies: CookieSpec[] = [],
) {
  return route(
    new NextRequest(`${APP}${path}`, {
      method: "POST",
      headers: {
        origin: APP,
        [CSRF_HEADER]: CSRF_HEADER_VALUE,
        "content-type": "application/json",
        cookie: cookieHeader(cookies),
      },
      body: JSON.stringify(body),
    }),
    {},
  );
}

function responseCookies(res: Response) {
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

const RESTRICTED = fakeAccessToken({ scope: "password_change" });
const NEW_SESSION = tokenResponse(
  {},
  { access_token: fakeAccessToken({ sid: "family-2" }) },
);

describe("POST /api/auth/password/change", () => {
  it("FE-7 uses the restricted token, then swaps it for a session and next", async () => {
    let bearer: string | null = null;
    let sent: unknown;
    server.use(
      http.post(`${IDENTITY}/v1/me/password`, async ({ request }) => {
        bearer = request.headers.get("authorization");
        sent = await request.json();
        return HttpResponse.json({ data: NEW_SESSION });
      }),
    );
    const res = await post(
      change,
      "/api/auth/password/change",
      { new_password: "granite-harbor-root" },
      await sealRestrictedCookie(RESTRICTED, "/admin/users"),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ data: { next: "/admin/users" } });
    expect(bearer).toBe(`Bearer ${RESTRICTED}`);
    expect(sent).toEqual({ new_password: "granite-harbor-root" });

    const { values, reader } = responseCookies(res);
    const session = await readSessionCookies(reader);
    expect(session.access?.token).toBe(NEW_SESSION.access_token);
    expect(session.refresh?.sessionId).toBe("family-2");
    expect(values.get(names.restricted)).toBe("");
  });

  it("FE-7 ends the session when the restricted token has expired", async () => {
    server.use(
      http.post(`${IDENTITY}/v1/me/password`, () =>
        HttpResponse.json(
          { error: { code: "ERR_UNAUTHORIZED", message: "unauthorized" } },
          { status: 401 },
        ),
      ),
    );
    const res = await post(
      change,
      "/api/auth/password/change",
      { new_password: "granite-harbor-root" },
      await sealRestrictedCookie(RESTRICTED),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({
      error: { meta: { reason: "SESSION_ENDED" } },
    });
    expect(responseCookies(res).values.get(names.restricted)).toBe("");
  });

  it("FE-32 passes a wrong current password through without ending the session", async () => {
    server.use(
      http.post(`${IDENTITY}/v1/me/password`, () =>
        HttpResponse.json(
          {
            error: {
              code: "ERR_UNAUTHORIZED",
              message: "unauthorized",
              meta: { reason: "INVALID_CREDENTIALS" },
            },
          },
          { status: 401 },
        ),
      ),
    );
    const res = await post(
      change,
      "/api/auth/password/change",
      { current_password: "wrong", new_password: "granite-harbor-root" },
      await sealSessionCookies(tokenResponse()),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({
      error: { meta: { reason: "INVALID_CREDENTIALS" } },
    });
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("refuses a request with no session at all", async () => {
    const res = await post(change, "/api/auth/password/change", {
      new_password: "granite-harbor-root",
    });
    expect(res.status).toBe(401);
  });

  it("refuses an expired restricted cookie without calling identity", async () => {
    const expired = fakeAccessToken({
      scope: "password_change",
      exp: nowSeconds() - 5,
    });
    const res = await post(
      change,
      "/api/auth/password/change",
      { new_password: "granite-harbor-root" },
      await sealRestrictedCookie(expired),
    );
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout and /logout-all", () => {
  it("FE-22 revokes the refresh token and clears every cookie", async () => {
    let sent: unknown;
    server.use(
      http.post(`${IDENTITY}/v1/auth/logout`, async ({ request }) => {
        sent = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const res = await post(
      logout,
      "/api/auth/logout",
      {},
      await sealSessionCookies(tokenResponse()),
    );
    expect(res.status).toBe(204);
    expect(sent).toEqual({ refresh_token: "refresh-token-1" });
    const { values } = responseCookies(res);
    expect(values.get(names.access)).toBe("");
    expect(values.get(names.refresh)).toBe("");
    expect(values.get(names.restricted)).toBe("");
  });

  it("FE-22 clears the cookies even when identity is down", async () => {
    server.use(
      http.post(`${IDENTITY}/v1/auth/logout-all`, () => HttpResponse.error()),
    );
    const res = await post(
      logoutAll,
      "/api/auth/logout-all",
      {},
      await sealSessionCookies(tokenResponse()),
    );
    expect(res.status).toBe(204);
    expect(responseCookies(res).values.get(names.refresh)).toBe("");
  });

  it("is idempotent without a session", async () => {
    const res = await post(logout, "/api/auth/logout", {});
    expect(res.status).toBe(204);
  });
});
