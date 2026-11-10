import { NextRequest, type NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";
import {
  cookieNames,
  sealRestrictedCookie,
  sealSessionCookies,
} from "@/lib/session/cookies";
import { seal } from "@/lib/session/crypto";
import { guardRequest } from "@/lib/session/guard";
import { createRefresher } from "@/lib/session/refresh";
import { isPublic, isRestrictedAllowed } from "@/lib/session/route-rules";
import type { RefreshFn, RefreshResult } from "@/lib/session/upstream";
import { fakeAccessToken, nowSeconds, tokenResponse } from "../helpers/tokens";

const APP = "http://localhost:3000";
const names = cookieNames();

async function sessionCookie(accessExpiresIn: number): Promise<string> {
  const specs = await sealSessionCookies(
    tokenResponse({ exp: nowSeconds() + accessExpiresIn, sid: "family-1" }),
  );
  return specs
    .filter((spec) => spec.value)
    .map((spec) => `${spec.name}=${spec.value}`)
    .join("; ");
}

async function restrictedCookie(): Promise<string> {
  const [spec] = await sealRestrictedCookie(
    fakeAccessToken({ scope: "password_change", sid: undefined }),
  );
  return `${spec?.name ?? ""}=${spec?.value ?? ""}`;
}

function request(path: string, cookie = ""): NextRequest {
  return new NextRequest(`${APP}${path}`, {
    headers: cookie ? { cookie } : {},
  });
}

function passedThrough(res: NextResponse): boolean {
  return res.headers.get("x-middleware-next") === "1";
}

function location(res: NextResponse): string | null {
  return res.headers.get("location");
}

const freshTokens = tokenResponse(
  { exp: nowSeconds() + 900, sid: "family-1" },
  { refresh_token: "rotated-refresh" },
);
const ok: RefreshFn = () =>
  Promise.resolve({ kind: "ok", tokens: freshTokens });

describe("route rules", () => {
  it("lists the public pages and routes", () => {
    expect(isPublic("/sign-in")).toBe(true);
    expect(isPublic("/sign-in/")).toBe(true);
    expect(isPublic("/api/auth/login")).toBe(true);
    expect(isPublic("/")).toBe(false);
    expect(isPublic("/admin/users")).toBe(false);
    expect(isPublic("/api/id/me")).toBe(false);
    expect(isPublic("/api/auth/switch-tenant")).toBe(false);
  });

  it("confines the restricted cookie to the password change and sign-out", () => {
    expect(isRestrictedAllowed("/change-password")).toBe(true);
    expect(isRestrictedAllowed("/api/auth/password/change")).toBe(true);
    expect(isRestrictedAllowed("/api/auth/logout")).toBe(true);
    expect(isRestrictedAllowed("/admin/users")).toBe(false);
  });
});

describe("guardRequest", () => {
  it("lets anyone open a public page", async () => {
    const res = await guardRequest(request("/forgot-password"));
    expect(passedThrough(res)).toBe(true);
  });

  it("sends a signed-in user away from /sign-in to /", async () => {
    const res = await guardRequest(
      request("/sign-in", await sessionCookie(900)),
    );
    expect(location(res)).toBe(`${APP}/`);
  });

  it("redirects a page without a session to /sign-in with next", async () => {
    const res = await guardRequest(request("/admin/users?page=2"));
    expect(res.status).toBe(307);
    expect(location(res)).toBe(
      `${APP}/sign-in?next=%2Fadmin%2Fusers%3Fpage%3D2`,
    );
  });

  it("answers 401 SESSION_ENDED for an API call without a session", async () => {
    const res = await guardRequest(request("/api/id/me"));
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toMatchObject({
      error: { meta: { reason: "SESSION_ENDED", cause: "NO_SESSION" } },
    });
  });

  it("does not refresh while the access token has more than 60 s left", async () => {
    const refresh = vi.fn<RefreshFn>();
    const res = await guardRequest(
      request("/admin/users", await sessionCookie(120)),
      { refresh },
    );
    expect(passedThrough(res)).toBe(true);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refreshes 60 s before expiry and writes the new cookies on the response and the forwarded request", async () => {
    const refresh = vi.fn<RefreshFn>(ok);
    const res = await guardRequest(
      request("/admin/users", await sessionCookie(30)),
      { refresh },
    );
    expect(passedThrough(res)).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh.mock.calls[0]?.[0]).toBe("family-1");
    expect(refresh.mock.calls[0]?.[1]).toBe("refresh-token-1");

    const setCookies = res.headers.getSetCookie().join("\n");
    expect(setCookies).toMatch(new RegExp(`${names.access}=[^;]+;`));
    expect(setCookies).toMatch(new RegExp(`${names.refresh}=[^;]+;`));

    // The page rendering in this same request sees the new cookies.
    const forwarded = res.headers.get("x-middleware-request-cookie") ?? "";
    const newAccess = res.cookies.get(names.access)?.value ?? "";
    expect(newAccess).not.toBe("");
    expect(forwarded).toContain(`${names.access}=${newAccess}`);
  });

  it("refreshes when only the refresh cookie is left", async () => {
    const [, refreshSpec] = await sealSessionCookies(tokenResponse());
    const refresh = vi.fn<RefreshFn>(ok);
    const res = await guardRequest(
      request("/", `${refreshSpec?.name ?? ""}=${refreshSpec?.value ?? ""}`),
      { refresh },
    );
    expect(passedThrough(res)).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("on REFRESH_REUSED clears the cookies and sends a page to sign-in with the reason and next", async () => {
    const res = await guardRequest(
      request("/admin/roles?q=x", await sessionCookie(10)),
      {
        refresh: () =>
          Promise.resolve({ kind: "ended", reason: "REFRESH_REUSED" }),
      },
    );
    expect(location(res)).toBe(
      `${APP}/sign-in?reason=REFRESH_REUSED&next=%2Fadmin%2Froles%3Fq%3Dx`,
    );
    const setCookies = res.headers.getSetCookie().join("\n");
    for (const name of Object.values(names)) {
      expect(setCookies).toContain(`${name}=;`);
    }
  });

  it("on REFRESH_REUSED answers an API call with 401 SESSION_ENDED and the reason", async () => {
    const res = await guardRequest(
      request("/api/id/me", await sessionCookie(10)),
      {
        refresh: () =>
          Promise.resolve({ kind: "ended", reason: "REFRESH_REUSED" }),
      },
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({
      error: { meta: { reason: "SESSION_ENDED", cause: "REFRESH_REUSED" } },
    });
    expect(res.headers.getSetCookie().join("\n")).toContain(
      `${names.refresh}=;`,
    );
  });

  it("lets the request through when identity is down and the access token is still valid", async () => {
    const res = await guardRequest(
      request("/admin/users", await sessionCookie(30)),
      { refresh: () => Promise.resolve({ kind: "unavailable" }) },
    );
    expect(passedThrough(res)).toBe(true);
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("answers 503 and keeps the cookies when identity is down and the access token has expired", async () => {
    const unavailable: RefreshFn = () =>
      Promise.resolve({ kind: "unavailable" });
    const page = await guardRequest(
      request("/admin/users", await sessionCookie(-5)),
      { refresh: unavailable },
    );
    expect(page.status).toBe(503);
    expect(page.headers.get("retry-after")).toBe("5");
    expect(page.headers.getSetCookie()).toEqual([]);

    const api = await guardRequest(
      request("/api/id/me", await sessionCookie(-5)),
      { refresh: unavailable },
    );
    expect(api.status).toBe(503);
    expect(await api.json()).toMatchObject({
      error: { meta: { reason: "UPSTREAM_UNAVAILABLE" } },
    });
  });

  it("ends a session whose refresh cookie has passed its expiry without calling identity", async () => {
    const now = nowSeconds();
    const expired = await seal({
      v: 1,
      token: "r",
      refreshExpiresAt: now - 1,
      sessionId: "family-1",
    });
    const refresh = vi.fn<RefreshFn>();
    const res = await guardRequest(
      request("/admin/users", `${names.refresh}=${expired}`),
      { refresh },
    );
    expect(location(res)).toContain("reason=REFRESH_EXPIRED");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("redirects a restricted user requesting /admin/users to /change-password", async () => {
    const res = await guardRequest(
      request("/admin/users", await restrictedCookie()),
    );
    expect(location(res)).toBe(`${APP}/change-password`);
  });

  it("lets a restricted user reach the password change and sign-out, and refuses other API calls", async () => {
    const cookie = await restrictedCookie();
    expect(
      passedThrough(await guardRequest(request("/change-password", cookie))),
    ).toBe(true);
    expect(
      passedThrough(
        await guardRequest(request("/api/auth/password/change", cookie)),
      ),
    ).toBe(true);
    expect(
      passedThrough(await guardRequest(request("/api/auth/logout", cookie))),
    ).toBe(true);
    const api = await guardRequest(request("/api/id/me", cookie));
    expect(api.status).toBe(403);
    expect(await api.json()).toMatchObject({
      error: { meta: { reason: "PASSWORD_CHANGE_REQUIRED" } },
    });
  });

  it("makes one upstream refresh for 20 concurrent requests of one session", async () => {
    let release: (value: RefreshResult) => void = () => undefined;
    const fetchTokens = vi.fn(
      () =>
        new Promise<RefreshResult>((resolve) => {
          release = resolve;
        }),
    );
    const refresh = createRefresher({ fetchTokens });
    const cookie = await sessionCookie(10);
    const pending = Array.from({ length: 20 }, (_, index) =>
      guardRequest(request(`/api/id/admin/users?n=${String(index)}`, cookie), {
        refresh,
      }),
    );
    // Let every request reach the lock before identity answers.
    await new Promise((resolve) => setTimeout(resolve, 20));
    release({ kind: "ok", tokens: freshTokens });
    const results = await Promise.all(pending);
    expect(fetchTokens).toHaveBeenCalledTimes(1);
    for (const res of results) {
      expect(passedThrough(res)).toBe(true);
      expect(res.headers.getSetCookie().join("\n")).toContain(
        `${names.refresh}=`,
      );
    }
  });
});
