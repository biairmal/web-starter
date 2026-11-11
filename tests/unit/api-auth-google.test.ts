import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET as start } from "@/app/api/auth/google/start/route";
import { GET as callback } from "@/app/auth/callback/route";
import { readSessionCookies } from "@/lib/session/cookies";
import {
  type NextCookie,
  nextCookieName,
  readNextCookie,
  sealNextCookie,
} from "@/lib/session/next-cookie";
import { server } from "../msw/server";
import { fakeAccessToken, tokenResponse } from "../helpers/tokens";

// Google sign-in (TRD 5.5): the start route and the callback.

const APP = "http://localhost:3000";
const IDENTITY = "http://identity.test";
const PUBLIC_IDENTITY = "https://id.example.test";

function cookiesOf(res: Response) {
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

async function callbackWith(query: string, saved?: NextCookie) {
  const headers: Record<string, string> = {};
  if (saved) {
    const cookie = await sealNextCookie(saved);
    headers.cookie = `${cookie.name}=${cookie.value}`;
  }
  return callback(
    new NextRequest(`${APP}/auth/callback${query}`, { headers }),
    {},
  );
}

function location(res: Response): string {
  const value = res.headers.get("location") ?? "";
  return value.startsWith(APP) ? value.slice(APP.length) : value;
}

describe("GET /api/auth/google/start", () => {
  it("FE-3 saves next and sends the browser to identity with redirect_to", async () => {
    const res = await start(
      new NextRequest(`${APP}/api/auth/google/start?next=%2Fadmin%2Fusers`),
      {},
    );
    expect(res.status).toBe(302);
    const target = new URL(res.headers.get("location") ?? "");
    expect(`${target.origin}${target.pathname}`).toBe(
      `${PUBLIC_IDENTITY}/v1/auth/google/start`,
    );
    expect(target.searchParams.get("redirect_to")).toBe(`${APP}/auth/callback`);
    expect(target.searchParams.has("tenant")).toBe(false);

    const { reader } = cookiesOf(res);
    expect(await readNextCookie(reader)).toEqual({ path: "/admin/users" });
    const line = res.headers
      .getSetCookie()
      .find((entry) => entry.startsWith(nextCookieName()));
    expect(line).toMatch(/HttpOnly/i);
    expect(line).toMatch(/SameSite=lax/i);
    expect(line).toMatch(/Max-Age=600/);
  });

  it("FE-3 passes a clean tenant slug and drops an unsafe next", async () => {
    const res = await start(
      new NextRequest(
        `${APP}/api/auth/google/start?next=%2F%2Fevil.example&tenant=Acme`,
      ),
      {},
    );
    const target = new URL(res.headers.get("location") ?? "");
    expect(target.searchParams.get("tenant")).toBe("acme");
    expect(await readNextCookie(cookiesOf(res).reader)).toEqual({
      path: "/",
      tenant: "acme",
    });
  });

  it("drops a tenant that is not a slug", async () => {
    const res = await start(
      new NextRequest(`${APP}/api/auth/google/start?tenant=a%26b%3Dc`),
      {},
    );
    const target = new URL(res.headers.get("location") ?? "");
    expect(target.searchParams.has("tenant")).toBe(false);
  });
});

describe("GET /auth/callback", () => {
  it("FE-3 exchanges the code, sets the session and returns to next", async () => {
    let sent: unknown;
    server.use(
      http.post(`${IDENTITY}/v1/auth/exchange`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ data: tokenResponse() });
      }),
    );
    const res = await callbackWith("?code=c1", { path: "/admin/users" });
    expect(res.status).toBe(303);
    expect(location(res)).toBe("/admin/users");
    expect(sent).toEqual({ code: "c1" });
    const { values, reader } = cookiesOf(res);
    expect((await readSessionCookies(reader)).refresh?.token).toBe(
      "refresh-token-1",
    );
    expect(values.get(nextCookieName())).toBe("");
  });

  it("FE-7 a forced password change from Google goes to /change-password", async () => {
    server.use(
      http.post(`${IDENTITY}/v1/auth/exchange`, () =>
        HttpResponse.json({
          data: tokenResponse(
            {},
            {
              access_token: fakeAccessToken({ scope: "password_change" }),
              must_change_password: true,
              refresh_token: undefined,
              refresh_expires_in: undefined,
            },
          ),
        }),
      ),
    );
    const res = await callbackWith("?code=c1", { path: "/x" });
    expect(location(res)).toBe("/change-password");
    const { reader } = cookiesOf(res);
    const session = await readSessionCookies(reader);
    expect(session.restricted?.next).toBe("/x");
    expect(session.refresh).toBeNull();
  });

  it("FE-3 sends an error to sign-in with the reason and next", async () => {
    const res = await callbackWith("?error=OAUTH_EMAIL_UNVERIFIED", {
      path: "/admin/users",
    });
    expect(location(res)).toBe(
      "/sign-in?reason=OAUTH_EMAIL_UNVERIFIED&next=%2Fadmin%2Fusers",
    );
  });

  it("keeps the tenant slug on TENANT_REQUIRED", async () => {
    const res = await callbackWith("?error=TENANT_REQUIRED", {
      path: "/",
      tenant: "acme",
    });
    expect(location(res)).toBe("/sign-in?reason=TENANT_REQUIRED&tenant=acme");
  });

  it("replaces an error that is not a reason", async () => {
    const res = await callbackWith("?error=%3Cb%3Ehi%3C%2Fb%3E");
    expect(location(res)).toBe("/sign-in?reason=OAUTH_STATE_INVALID");
  });

  it("treats a used code and a missing code as Google not completing", async () => {
    server.use(
      http.post(`${IDENTITY}/v1/auth/exchange`, () =>
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
    expect(location(await callbackWith("?code=used"))).toBe(
      "/sign-in?reason=OAUTH_STATE_INVALID",
    );
    expect(location(await callbackWith(""))).toBe(
      "/sign-in?reason=OAUTH_STATE_INVALID",
    );
  });

  it("passes a refusal reason from the exchange through", async () => {
    server.use(
      http.post(`${IDENTITY}/v1/auth/exchange`, () =>
        HttpResponse.json(
          {
            error: {
              code: "ERR_FORBIDDEN",
              message: "no",
              meta: { reason: "ACCOUNT_DISABLED" },
            },
          },
          { status: 403 },
        ),
      ),
    );
    expect(location(await callbackWith("?code=c1"))).toBe(
      "/sign-in?reason=ACCOUNT_DISABLED",
    );
  });

  it("FE-33 returns a linked account to the security page", async () => {
    const res = await callbackWith("?linked=1");
    expect(location(res)).toBe("/account/security?linked=1");
  });
});
