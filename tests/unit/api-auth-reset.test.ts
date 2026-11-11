import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST as forgot } from "@/app/api/auth/password/forgot/route";
import { POST as reset } from "@/app/api/auth/password/reset/route";
import { CSRF_HEADER, CSRF_HEADER_VALUE } from "@/lib/bff/csrf";
import { cookieNames } from "@/lib/session/cookies";
import { server } from "../msw/server";

// Forgot and reset password (TRD 7.3, APP_FLOW 5.5).

const APP = "http://localhost:3000";
const IDENTITY = "http://identity.test";
const names = cookieNames();

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

function cleared(res: Response): string[] {
  return res.headers
    .getSetCookie()
    .filter((line) => /Max-Age=0/i.test(line))
    .map((line) => line.split("=")[0] ?? "");
}

describe("POST /api/auth/password/forgot", () => {
  it("FE-6 forwards the email and answers 202", async () => {
    let sent: unknown;
    server.use(
      http.post(`${IDENTITY}/v1/auth/password/forgot`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(
          { data: { status: "accepted" } },
          { status: 202 },
        );
      }),
    );
    const res = await post(forgot, "/api/auth/password/forgot", {
      email: "a@example.com",
    });
    expect(res.status).toBe(202);
    expect(sent).toEqual({ email: "a@example.com" });
  });
});

describe("POST /api/auth/password/reset", () => {
  it("FE-6 clears every session cookie after a reset", async () => {
    let sent: unknown;
    server.use(
      http.post(`${IDENTITY}/v1/auth/password/reset`, async ({ request }) => {
        sent = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const body = { token: "t1", password: "copper-meadow-signal" };
    const res = await post(reset, "/api/auth/password/reset", body);
    expect(res.status).toBe(204);
    expect(sent).toEqual(body);
    expect(cleared(res).sort()).toEqual(
      [names.access, names.refresh, names.restricted].sort(),
    );
  });

  it("keeps the cookies and passes the error through when the reset fails", async () => {
    server.use(
      http.post(`${IDENTITY}/v1/auth/password/reset`, () =>
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
    const res = await post(reset, "/api/auth/password/reset", {
      token: "old",
      password: "copper-meadow-signal",
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: { meta: { reason: "TOKEN_INVALID" } },
    });
    expect(cleared(res)).toEqual([]);
  });
});
