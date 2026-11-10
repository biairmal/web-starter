import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearSession,
  cookieNames,
  readSessionCookies,
  sealRestrictedCookie,
  sealSessionCookies,
  writeRestricted,
  writeSession,
} from "@/lib/session/cookies";
import { seal } from "@/lib/session/crypto";
import { sessionFrom } from "@/lib/session/server";
import { fakeAccessToken, nowSeconds, tokenResponse } from "../helpers/tokens";

const names = cookieNames();

/** Turns Set-Cookie headers into a Cookie request header. */
function requestWith(res: NextResponse): NextRequest {
  const cookie = res.cookies
    .getAll()
    .filter((c) => c.value !== "")
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  return new NextRequest("http://localhost:3000/", { headers: { cookie } });
}

function setCookieHeader(res: NextResponse, name: string): string {
  const header = res.headers
    .getSetCookie()
    .find((h) => h.startsWith(`${name}=`));
  if (!header) {
    throw new Error(`no Set-Cookie for ${name}`);
  }
  return header;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("session cookies", () => {
  it("uses the __Host- prefix and the configured name prefix", () => {
    expect(names).toEqual({
      access: "__Host-ws_at",
      refresh: "__Host-ws_rt",
      restricted: "__Host-ws_pc",
    });
  });

  it("writes the access and refresh cookies with the TRD 5.1 attributes", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-10T00:00:00Z") });
    const res = new NextResponse(null);
    await writeSession(res, tokenResponse({ exp: nowSeconds() + 900 }));

    const access = setCookieHeader(res, names.access);
    expect(access).toMatch(/HttpOnly/i);
    expect(access).toMatch(/Secure/i);
    expect(access).toMatch(/SameSite=lax/i);
    expect(access).toMatch(/Path=\//);
    expect(access).toMatch(/Max-Age=960/);

    const refresh = setCookieHeader(res, names.refresh);
    expect(refresh).toMatch(/HttpOnly/i);
    expect(refresh).toMatch(/Secure/i);
    expect(refresh).toMatch(/SameSite=lax/i);
    expect(refresh).toMatch(/Max-Age=2592000/);

    // Signing in normally removes a leftover restricted cookie.
    expect(setCookieHeader(res, names.restricted)).toMatch(/Max-Age=0/);
  });

  it("round-trips the tokens and takes the session ID from the sid claim", async () => {
    const res = new NextResponse(null);
    const tokens = tokenResponse({ sid: "family-1" });
    await writeSession(res, tokens);

    const session = await sessionFrom(requestWith(res).cookies);
    expect(session).toMatchObject({
      accessToken: tokens.access_token,
      refreshToken: "refresh-token-1",
      sessionId: "family-1",
      claims: { sid: "family-1" },
    });
  });

  it("keeps the session ID across a refresh, because sid is the family ID", async () => {
    const first = new NextResponse(null);
    await writeSession(first, tokenResponse({ sid: "family-1" }));
    const second = new NextResponse(null);
    await writeSession(
      second,
      tokenResponse({ sid: "family-1" }, { refresh_token: "refresh-token-2" }),
    );
    const before = await sessionFrom(requestWith(first).cookies);
    const after = await sessionFrom(requestWith(second).cookies);
    expect(after?.sessionId).toBe(before?.sessionId);
    expect(after?.refreshToken).toBe("refresh-token-2");
  });

  it("refuses a token response without a refresh token", async () => {
    await expect(
      sealSessionCookies(tokenResponse({}, { refresh_token: undefined })),
    ).rejects.toThrow(/no refresh token/);
  });

  it("refuses an access token without a sid claim", async () => {
    const tokens = tokenResponse(
      {},
      { access_token: fakeAccessToken({ sid: undefined }) },
    );
    await expect(sealSessionCookies(tokens)).rejects.toThrow(/sid/);
  });

  it("writes the restricted cookie as SameSite=Strict for at most 10 minutes and drops the others", async () => {
    const res = new NextResponse(null);
    await writeRestricted(
      res,
      fakeAccessToken({
        scope: "password_change",
        sid: undefined,
        exp: nowSeconds() + 3600,
      }),
      "/admin/users",
    );
    const restricted = setCookieHeader(res, names.restricted);
    expect(restricted).toMatch(/HttpOnly/i);
    expect(restricted).toMatch(/Secure/i);
    expect(restricted).toMatch(/SameSite=strict/i);
    expect(restricted).toMatch(/Max-Age=600/);
    expect(setCookieHeader(res, names.access)).toMatch(/Max-Age=0/);
    expect(setCookieHeader(res, names.refresh)).toMatch(/Max-Age=0/);

    const cookies = await readSessionCookies(requestWith(res).cookies);
    expect(cookies.restricted).toMatchObject({ v: 1, next: "/admin/users" });
    expect(cookies.access).toBeNull();
  });

  it("clears all three cookies", () => {
    const res = new NextResponse(null);
    clearSession(res);
    for (const name of [names.access, names.refresh, names.restricted]) {
      expect(setCookieHeader(res, name)).toMatch(/Max-Age=0/);
    }
  });

  it("treats a tampered cookie as no session", async () => {
    const res = new NextResponse(null);
    await writeSession(res, tokenResponse());
    const request = requestWith(res);
    const access = request.cookies.get(names.access)?.value ?? "";
    request.cookies.set(names.access, `${access.slice(0, -4)}AAAA`);
    await expect(sessionFrom(request.cookies)).resolves.toBeNull();
  });

  it("treats a cookie with an unknown version as no session", async () => {
    const res = new NextResponse(null);
    await writeSession(res, tokenResponse());
    const request = requestWith(res);
    request.cookies.set(
      names.access,
      await seal({ v: 2, token: fakeAccessToken(), exp: nowSeconds() + 900 }),
    );
    await expect(sessionFrom(request.cookies)).resolves.toBeNull();
  });

  it("is no session without the refresh cookie", async () => {
    const res = new NextResponse(null);
    await writeSession(res, tokenResponse());
    const request = requestWith(res);
    request.cookies.delete(names.refresh);
    await expect(sessionFrom(request.cookies)).resolves.toBeNull();
  });

  it("keeps each cookie under 4 KB with a 2 KB access token", async () => {
    const accessToken = fakeAccessToken({ perms: ["notes:read"] }, 2048);
    expect(accessToken.length).toBeGreaterThanOrEqual(2048);
    const specs = [
      ...(await sealSessionCookies(
        tokenResponse({}, { access_token: accessToken }),
      )),
      ...(await sealRestrictedCookie(
        accessToken,
        "/some/long/next/path?with=query",
      )),
    ];
    for (const spec of specs) {
      // name=value plus the longest attribute string a browser stores.
      const size =
        `${spec.name}=${spec.value}; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=strict`
          .length;
      expect(size, spec.name).toBeLessThan(4096);
    }
  });
});

describe("getSession", () => {
  it("reads the cookies of the current request", async () => {
    const res = new NextResponse(null);
    await writeSession(res, tokenResponse({ sid: "family-9" }));
    const request = requestWith(res);
    vi.doMock("next/headers", () => ({
      cookies: () => Promise.resolve(request.cookies),
    }));
    vi.resetModules();
    const fresh = await import("@/lib/session/server");
    await expect(fresh.getSession()).resolves.toMatchObject({
      sessionId: "family-9",
    });
    vi.doUnmock("next/headers");
  });
});
