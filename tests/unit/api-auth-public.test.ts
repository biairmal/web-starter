import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST as resend } from "@/app/api/auth/email/resend/route";
import { POST as verify } from "@/app/api/auth/email/verify/route";
import { POST as register } from "@/app/api/auth/register/route";
import { CSRF_HEADER, CSRF_HEADER_VALUE } from "@/lib/bff/csrf";
import { server } from "../msw/server";

// The public pass-through routes (TRD 7.3): the body is checked, sent to
// identity as it is, and identity's answer comes back unchanged.

const APP = "http://localhost:3000";
const IDENTITY = "http://identity.test";

type Route = (request: NextRequest, context: unknown) => Promise<Response>;

function post(
  route: Route,
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return route(
    new NextRequest(`${APP}${path}`, {
      method: "POST",
      headers: {
        origin: APP,
        [CSRF_HEADER]: CSRF_HEADER_VALUE,
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    }),
    {},
  );
}

const accepted = {
  timestamp: "2026-11-11T00:00:00Z",
  data: { status: "accepted" },
};

describe("POST /api/auth/register", () => {
  it("FE-4 forwards the body and answers identity's 202", async () => {
    let sent: unknown;
    server.use(
      http.post(`${IDENTITY}/v1/auth/register`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(accepted, { status: 202 });
      }),
    );
    const body = {
      email: "rina@example.com",
      password: "violet-orchard-ferry",
      display_name: "Rina",
    };
    const res = await post(register, "/api/auth/register", body);
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual(accepted);
    expect(sent).toEqual(body);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("passes PASSWORD_POLICY field errors through", async () => {
    const error = {
      timestamp: "2026-11-11T00:00:00Z",
      error: {
        code: "ERR_BAD_REQUEST",
        message: "validation failed",
        meta: {
          reason: "PASSWORD_POLICY",
          fields: { password: "password is too common" },
        },
      },
    };
    server.use(
      http.post(`${IDENTITY}/v1/auth/register`, () =>
        HttpResponse.json(error, { status: 400 }),
      ),
    );
    const res = await post(register, "/api/auth/register", {
      email: "rina@example.com",
      password: "password123",
      display_name: "Rina",
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(error);
  });

  it("refuses unknown fields and a missing CSRF header", async () => {
    const extra = await post(register, "/api/auth/register", {
      email: "a@b.c",
      password: "x",
      display_name: "A",
      is_super_admin: true,
    });
    expect(extra.status).toBe(400);
    const csrf = await post(
      register,
      "/api/auth/register",
      { email: "a@b.c", password: "x", display_name: "A" },
      { origin: "https://evil.example" },
    );
    expect(csrf.status).toBe(403);
  });
});

describe("POST /api/auth/email/verify", () => {
  it("FE-5 sends the token in the body and answers 204", async () => {
    let sent: unknown;
    server.use(
      http.post(`${IDENTITY}/v1/auth/email/verify`, async ({ request }) => {
        sent = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const res = await post(verify, "/api/auth/email/verify", { token: "t1" });
    expect(res.status).toBe(204);
    expect(sent).toEqual({ token: "t1" });
  });

  it("passes TOKEN_INVALID through", async () => {
    server.use(
      http.post(`${IDENTITY}/v1/auth/email/verify`, () =>
        HttpResponse.json(
          {
            timestamp: "2026-11-11T00:00:00Z",
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
    const res = await post(verify, "/api/auth/email/verify", { token: "old" });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: { meta: { reason: "TOKEN_INVALID" } },
    });
  });
});

describe("POST /api/auth/email/resend", () => {
  it("FE-4 answers 202 and keeps Retry-After on RATE_LIMITED", async () => {
    server.use(
      http.post(`${IDENTITY}/v1/auth/email/resend`, () =>
        HttpResponse.json(accepted, { status: 202 }),
      ),
    );
    expect(
      (await post(resend, "/api/auth/email/resend", { email: "a@b.c" })).status,
    ).toBe(202);

    server.use(
      http.post(`${IDENTITY}/v1/auth/email/resend`, () =>
        HttpResponse.json(
          {
            timestamp: "2026-11-11T00:00:00Z",
            error: {
              code: "ERR_TOO_MANY_REQUESTS",
              message: "slow down",
              meta: { reason: "RATE_LIMITED" },
            },
          },
          { status: 429, headers: { "Retry-After": "30" } },
        ),
      ),
    );
    const limited = await post(resend, "/api/auth/email/resend", {
      email: "a@b.c",
    });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("30");
  });
});
