import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import {
  cleanSegments,
  identityAllowList,
  isAllowed,
} from "@/lib/bff/allowlist";
import { clientIp, identityFetch } from "@/lib/session/identity-fetch";
import type { Session } from "@/lib/session/server";
import { server } from "../msw/server";
import { fakeAccessToken } from "../helpers/tokens";

describe("clientIp", () => {
  const headers = (xff: string) => new Headers({ "x-forwarded-for": xff });

  it("takes the entry the last trusted proxy appended", () => {
    expect(clientIp(headers("198.51.100.1, 203.0.113.7"), 1)).toBe(
      "203.0.113.7",
    );
    expect(clientIp(headers("198.51.100.1, 203.0.113.7"), 2)).toBe(
      "198.51.100.1",
    );
  });

  it("does not trust entries the client could have added", () => {
    // One trusted hop: the spoofed first entry is ignored.
    expect(clientIp(headers("1.2.3.4, 203.0.113.7"), 1)).toBe("203.0.113.7");
  });

  it("uses the first entry when there are fewer entries than hops", () => {
    expect(clientIp(headers("203.0.113.7"), 3)).toBe("203.0.113.7");
  });

  it("ignores the header with zero trusted hops", () => {
    expect(clientIp(headers("203.0.113.7"), 0)).toBeUndefined();
  });

  it("drops a value that is not an IP", () => {
    expect(clientIp(headers("not-an-ip"), 1)).toBeUndefined();
    expect(clientIp(headers("999.1.1.1"), 1)).toBeUndefined();
    expect(clientIp(new Headers(), 1)).toBeUndefined();
  });

  it("accepts IPv6", () => {
    expect(clientIp(headers("2001:db8::1"), 1)).toBe("2001:db8::1");
  });
});

describe("allow-list", () => {
  it("rejects unsafe segments", () => {
    expect(cleanSegments([])).toBeNull();
    expect(cleanSegments(undefined)).toBeNull();
    expect(cleanSegments(["me", ""])).toBeNull();
    expect(cleanSegments(["me", "."])).toBeNull();
    expect(cleanSegments(["admin", "users", ".."])).toBeNull();
    expect(cleanSegments(["admin", "a\\b"])).toBeNull();
    expect(cleanSegments(["admin", "a%2e"])).toBeNull();
    expect(cleanSegments(["admin", "users"])).toEqual(["admin", "users"]);
  });

  it("matches exact and subtree rules", () => {
    expect(isAllowed(["admin", "permissions"], identityAllowList)).toBe(true);
    expect(isAllowed(["admin", "permissions", "x"], identityAllowList)).toBe(
      false,
    );
    expect(
      isAllowed(["admin", "users", "u1", "roles"], identityAllowList),
    ).toBe(true);
    expect(isAllowed(["admin", "usersx"], identityAllowList)).toBe(false);
    expect(isAllowed(["me", "password"], identityAllowList)).toBe(false);
    expect(isAllowed(["me", "password", "x"], identityAllowList)).toBe(false);
    expect(isAllowed(["me", "sessions", "s1"], identityAllowList)).toBe(true);
  });
});

describe("identityFetch", () => {
  const session: Session = {
    accessToken: fakeAccessToken(),
    expiresAt: 9e9,
    claims: { sub: "u", tid: "t", exp: 9e9 },
    sessionId: "family-1",
    refreshToken: "refresh-token-1",
  };

  it("calls IDENTITY_INTERNAL_URL with the bearer token", async () => {
    let auth: string | null = null;
    server.use(
      http.get("http://identity.test/v1/me", ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ timestamp: "t", data: {} });
      }),
    );
    const res = await identityFetch("/v1/me", {}, session, {
      call: { requestId: "r1" },
    });
    expect(res.status).toBe(200);
    expect(auth).toBe(`Bearer ${session.accessToken}`);
  });

  it("does not refresh without a cookie writer, and ends the session instead", async () => {
    server.use(
      http.get("http://identity.test/v1/me", () =>
        HttpResponse.json(
          { timestamp: "t", error: { code: "ERR_UNAUTHORIZED", message: "x" } },
          { status: 401 },
        ),
      ),
    );
    await expect(
      identityFetch("/v1/me", {}, session, { call: { requestId: "r1" } }),
    ).rejects.toMatchObject({ meta: { reason: "SESSION_ENDED" } });
  });
});
