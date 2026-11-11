import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET as link } from "@/app/api/auth/google/link/route";
import { GET as callback } from "@/app/auth/callback/route";
import { describeDevice } from "@/features/account/device";
import { type CookieSpec, sealSessionCookies } from "@/lib/session/cookies";
import {
  type NextCookie,
  readNextCookie,
  sealNextCookie,
} from "@/lib/session/next-cookie";
import { server } from "../msw/server";
import { tokenResponse } from "../helpers/tokens";

// Linking Google to a signed-in account (TRD 5.5, APP_FLOW 5.16, FE-33).

const APP = "http://localhost:3000";
const IDENTITY = "http://identity.test";
const GOOGLE = "https://accounts.google.test/o/oauth2/v2/auth?state=s1";

function cookieHeader(specs: CookieSpec[]): string {
  return specs
    .filter((spec) => spec.value)
    .map((spec) => `${spec.name}=${spec.value}`)
    .join("; ");
}

async function linkAs(signedIn: boolean) {
  const cookies = signedIn ? await sealSessionCookies(tokenResponse()) : [];
  return link(
    new NextRequest(`${APP}/api/auth/google/link`, {
      headers: { cookie: cookieHeader(cookies) },
    }),
    {},
  );
}

function location(res: Response): string {
  const value = res.headers.get("location") ?? "";
  return value.startsWith(APP) ? value.slice(APP.length) : value;
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
    get: (name: string) => {
      const value = values.get(name);
      return value ? { value } : undefined;
    },
  };
}

function errorBody(reason: string) {
  return {
    timestamp: "2026-11-11T00:00:00Z",
    error: { code: "ERR", message: "failed", meta: { reason } },
  };
}

describe("GET /api/auth/google/link", () => {
  it("FE-33 asks identity with the bearer token and redirect_to, then follows its redirect", async () => {
    let seen: { auth: string | null; redirectTo: string | null } | undefined;
    server.use(
      http.get(`${IDENTITY}/v1/auth/google/link/start`, ({ request }) => {
        seen = {
          auth: request.headers.get("authorization"),
          redirectTo: new URL(request.url).searchParams.get("redirect_to"),
        };
        return new HttpResponse(null, {
          status: 302,
          headers: { Location: GOOGLE },
        });
      }),
    );
    const res = await linkAs(true);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(GOOGLE);
    expect(seen?.auth).toMatch(/^Bearer /);
    expect(seen?.redirectTo).toBe(`${APP}/auth/callback`);
    // A Google error on the way back returns to the security page.
    expect(await readNextCookie(responseCookies(res))).toEqual({
      path: "/account/security",
      link: true,
    });
  });

  it("FE-33 returns to the security page with identity's reason", async () => {
    server.use(
      http.get(`${IDENTITY}/v1/auth/google/link/start`, () =>
        HttpResponse.json(errorBody("PROVIDER_DISABLED"), { status: 404 }),
      ),
    );
    const res = await linkAs(true);
    expect(res.status).toBe(303);
    expect(location(res)).toBe("/account/security?error=PROVIDER_DISABLED");
  });

  it("does not follow a redirect that is not an http(s) URL", async () => {
    server.use(
      http.get(
        `${IDENTITY}/v1/auth/google/link/start`,
        () =>
          new HttpResponse(null, {
            status: 302,
            headers: { Location: "javascript:alert(1)" },
          }),
      ),
    );
    expect(location(await linkAs(true))).toBe(
      "/account/security?error=UPSTREAM_UNAVAILABLE",
    );
  });

  it("treats identity being down as unavailable", async () => {
    server.use(
      http.get(`${IDENTITY}/v1/auth/google/link/start`, () =>
        HttpResponse.error(),
      ),
    );
    expect(location(await linkAs(true))).toBe(
      "/account/security?error=UPSTREAM_UNAVAILABLE",
    );
  });

  it("sends a signed-out browser to sign-in and back", async () => {
    const res = await linkAs(false);
    expect(location(res)).toBe(
      "/sign-in?reason=SESSION_ENDED&next=%2Faccount%2Fsecurity",
    );
  });
});

describe("GET /auth/callback after a link", () => {
  async function callbackWith(query: string, saved: NextCookie) {
    const cookie = await sealNextCookie(saved);
    return callback(
      new NextRequest(`${APP}/auth/callback${query}`, {
        headers: { cookie: `${cookie.name}=${cookie.value}` },
      }),
      {},
    );
  }

  it("FE-33 returns a link error to the security page, not sign-in", async () => {
    const res = await callbackWith("?error=OAUTH_EMAIL_UNVERIFIED", {
      path: "/account/security",
      link: true,
    });
    expect(location(res)).toBe(
      "/account/security?error=OAUTH_EMAIL_UNVERIFIED",
    );
  });

  it("replaces an error that is not a reason", async () => {
    const res = await callbackWith("?error=%3Cscript%3E", {
      path: "/account/security",
      link: true,
    });
    expect(location(res)).toBe("/account/security?error=OAUTH_STATE_INVALID");
  });

  it("a sign-in error still goes to sign-in", async () => {
    const res = await callbackWith("?error=OAUTH_EMAIL_UNVERIFIED", {
      path: "/",
    });
    expect(location(res)).toBe("/sign-in?reason=OAUTH_EMAIL_UNVERIFIED");
  });
});

describe("describeDevice", () => {
  it.each([
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
      { browser: "Chrome", os: "Windows" },
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0",
      { browser: "Edge", os: "Windows" },
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      { browser: "Safari", os: "iOS" },
    ],
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:131.0) Gecko/20100101 Firefox/131.0",
      { browser: "Firefox", os: "macOS" },
    ],
    [
      "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
      { browser: "Chrome", os: "Android" },
    ],
    ["curl/8.9.1", {}],
    [undefined, {}],
  ])("names %s", (userAgent, expected) => {
    expect(describeDevice(userAgent)).toEqual(expected);
  });
});
