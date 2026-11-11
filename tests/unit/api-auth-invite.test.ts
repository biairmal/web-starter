import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST as accept } from "@/app/api/auth/invite/accept/route";
import { POST as info } from "@/app/api/auth/invite/info/route";
import { CSRF_HEADER, CSRF_HEADER_VALUE } from "@/lib/bff/csrf";
import { readSessionCookies } from "@/lib/session/cookies";
import { server } from "../msw/server";
import { tokenResponse } from "../helpers/tokens";

// Invite routes (TRD 6.3, 7.2, 7.3; FE-9).

const APP = "http://localhost:3000";
const IDENTITY = "http://identity.test";

type Route = (request: NextRequest, context: unknown) => Promise<Response>;

function post(route: Route, path: string, body: unknown) {
  return route(
    new NextRequest(`${APP}${path}`, {
      method: "POST",
      headers: {
        origin: APP,
        [CSRF_HEADER]: CSRF_HEADER_VALUE,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }),
    {},
  );
}

function reader(res: Response) {
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

describe("POST /api/auth/invite/info", () => {
  it("FE-9 takes the token from the body and asks identity for the invite", async () => {
    let path = "";
    const invite = {
      tenant: { name: "Acme" },
      email_masked: "b**@example.com",
      has_password: false,
    };
    server.use(
      http.get(`${IDENTITY}/v1/auth/invite/:token`, ({ request }) => {
        path = new URL(request.url).pathname;
        return HttpResponse.json({ data: invite });
      }),
    );
    const res = await post(info, "/api/auth/invite/info", {
      token: "a/b?c",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: invite });
    expect(path).toBe("/v1/auth/invite/a%2Fb%3Fc");
  });

  it("passes TOKEN_INVALID through", async () => {
    server.use(
      http.get(`${IDENTITY}/v1/auth/invite/:token`, () =>
        HttpResponse.json(
          {
            error: {
              code: "ERR_BAD_REQUEST",
              message: "bad",
              meta: { reason: "TOKEN_INVALID" },
            },
          },
          { status: 400 },
        ),
      ),
    );
    const res = await post(info, "/api/auth/invite/info", { token: "old" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/invite/accept", () => {
  it("FE-9 signs in to the invited tenant and answers next", async () => {
    let sent: unknown;
    server.use(
      http.post(`${IDENTITY}/v1/auth/invite/accept`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ data: tokenResponse() });
      }),
    );
    const body = { token: "t1", password: "saffron-lagoon", display_name: "B" };
    const res = await post(accept, "/api/auth/invite/accept", body);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(JSON.parse(text)).toMatchObject({ data: { next: "/" } });
    expect(text).not.toMatch(/token/i);
    expect(sent).toEqual(body);
    const session = await readSessionCookies(reader(res));
    expect(session.refresh?.token).toBe("refresh-token-1");
  });

  it("passes PASSWORD_POLICY through without cookies", async () => {
    server.use(
      http.post(`${IDENTITY}/v1/auth/invite/accept`, () =>
        HttpResponse.json(
          {
            error: {
              code: "ERR_BAD_REQUEST",
              message: "validation failed",
              meta: { reason: "PASSWORD_POLICY" },
            },
          },
          { status: 400 },
        ),
      ),
    );
    const res = await post(accept, "/api/auth/invite/accept", {
      token: "t1",
      password: "password1234",
    });
    expect(res.status).toBe(400);
    expect(res.headers.getSetCookie()).toEqual([]);
  });
});
