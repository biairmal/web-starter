import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/session/route";
import {
  clearedSessionCookies,
  sealRestrictedCookie,
  sealSessionCookies,
} from "@/lib/session/cookies";
import { fakeAccessToken, nowSeconds, tokenResponse } from "../helpers/tokens";

const APP = "http://localhost:3000";

function request(cookies: { name: string; value: string }[]): NextRequest {
  const header = cookies
    .filter((cookie) => cookie.value !== "")
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  return new NextRequest(`${APP}/api/session`, {
    headers: header ? { cookie: header } : {},
  });
}

async function data(res: Response) {
  const body = (await res.json()) as { data: Record<string, unknown> };
  return body.data;
}

describe("GET /api/session", () => {
  it("reports a signed-in browser and when its access token expires", async () => {
    const exp = nowSeconds() + 900;
    const cookies = await sealSessionCookies(
      tokenResponse({ exp }, { access_token: fakeAccessToken({ exp }) }),
    );
    const res = await GET(request(cookies), {});
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await data(res)).toEqual({
      signed_in: true,
      expires_at: exp,
      restricted: false,
    });
  });

  it("reports a browser without a session", async () => {
    const res = await GET(request(clearedSessionCookies()), {});
    expect(await data(res)).toEqual({
      signed_in: false,
      expires_at: null,
      restricted: false,
    });
  });

  it("reports a browser that holds only the password-change cookie", async () => {
    const cookies = await sealRestrictedCookie(
      fakeAccessToken({ scope: "password_change" }),
    );
    const res = await GET(request(cookies), {});
    expect(await data(res)).toMatchObject({
      signed_in: false,
      restricted: true,
    });
  });

  it("never returns a token", async () => {
    const cookies = await sealSessionCookies(tokenResponse());
    const text = await (await GET(request(cookies), {})).text();
    expect(text).not.toMatch(/token/i);
    expect(text).not.toContain("refresh-token-1");
  });
});
