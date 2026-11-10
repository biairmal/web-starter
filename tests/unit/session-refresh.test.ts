import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  REFRESH_HOLD_MS,
  createRefresher,
  fetchRefresh,
} from "@/lib/session/refresh";
import type { RefreshResult } from "@/lib/session/upstream";
import { server } from "../msw/server";
import { tokenResponse } from "../helpers/tokens";

const call = { requestId: "req-1", clientIp: "203.0.113.7", userAgent: "UA/1" };

afterEach(() => {
  vi.useRealTimers();
});

describe("single-flight refresh", () => {
  it("makes one upstream call for 20 concurrent refreshes of one session, and all get the same tokens", async () => {
    const tokens = tokenResponse({}, { refresh_token: "rotated" });
    let release: (value: RefreshResult) => void = () => undefined;
    const fetchTokens = vi.fn(
      () =>
        new Promise<RefreshResult>((resolve) => {
          release = resolve;
        }),
    );
    const refresh = createRefresher({ fetchTokens });

    const pending = Array.from({ length: 20 }, () =>
      refresh("family-1", "old-refresh", call),
    );
    release({ kind: "ok", tokens });
    const results = await Promise.all(pending);

    expect(fetchTokens).toHaveBeenCalledTimes(1);
    expect(fetchTokens).toHaveBeenCalledWith("old-refresh", call);
    for (const result of results) {
      expect(result).toEqual({ kind: "ok", tokens });
      expect(result).toBe(results[0]);
    }
  });

  it("reuses the settled result for a call 5 s later, and calls again after the hold", async () => {
    vi.useFakeTimers();
    const fetchTokens = vi.fn(() =>
      Promise.resolve<RefreshResult>({ kind: "ok", tokens: tokenResponse() }),
    );
    const refresh = createRefresher({ fetchTokens });

    const first = await refresh("family-1", "old-refresh", call);
    await vi.advanceTimersByTimeAsync(5_000);
    const later = await refresh("family-1", "old-refresh", call);
    expect(later).toBe(first);
    expect(fetchTokens).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(REFRESH_HOLD_MS);
    await refresh("family-1", "new-refresh", call);
    expect(fetchTokens).toHaveBeenCalledTimes(2);
  });

  it("refreshes different sessions separately", async () => {
    const fetchTokens = vi.fn(() =>
      Promise.resolve<RefreshResult>({ kind: "ok", tokens: tokenResponse() }),
    );
    const refresh = createRefresher({ fetchTokens });
    await Promise.all([
      refresh("family-1", "a", call),
      refresh("family-2", "b", call),
    ]);
    expect(fetchTokens).toHaveBeenCalledTimes(2);
  });

  it("treats a thrown error as identity being unavailable", async () => {
    const refresh = createRefresher({
      fetchTokens: () => Promise.reject(new Error("boom")),
    });
    await expect(refresh("family-1", "a", call)).resolves.toEqual({
      kind: "unavailable",
    });
  });
});

describe("POST /v1/auth/refresh mapping", () => {
  const url = "http://identity.test/v1/auth/refresh";

  function errorWith(status: number, reason?: string) {
    return () =>
      HttpResponse.json(
        {
          timestamp: "t",
          error: {
            code: "ERR",
            message: "x",
            ...(reason ? { meta: { reason } } : {}),
          },
        },
        { status },
      );
  }

  it("sends the refresh token with the request ID, client IP and user agent", async () => {
    let seen: { body: unknown; headers: Headers } | undefined;
    const tokens = tokenResponse();
    server.use(
      http.post(url, async ({ request }) => {
        seen = { body: await request.json(), headers: request.headers };
        return HttpResponse.json({ timestamp: "t", data: tokens });
      }),
    );
    await expect(fetchRefresh("old-refresh", call)).resolves.toEqual({
      kind: "ok",
      tokens,
    });
    expect(seen?.body).toEqual({ refresh_token: "old-refresh" });
    expect(seen?.headers.get("x-request-id")).toBe("req-1");
    expect(seen?.headers.get("x-forwarded-for")).toBe("203.0.113.7");
    expect(seen?.headers.get("user-agent")).toBe("UA/1");
    expect(seen?.headers.get("authorization")).toBeNull();
  });

  it.each([
    [401, "REFRESH_REUSED"],
    [401, "REFRESH_EXPIRED"],
    [401, "INVALID_CREDENTIALS"],
    [403, "ACCOUNT_DISABLED"],
    [403, "TENANT_SUSPENDED"],
    [403, "PASSWORD_CHANGE_REQUIRED"],
  ])("ends the session on %i %s", async (status, reason) => {
    server.use(http.post(url, errorWith(status, reason)));
    await expect(fetchRefresh("t", call)).resolves.toEqual({
      kind: "ended",
      reason,
    });
  });

  it("ends the session with INVALID_CREDENTIALS on a 401 without a reason", async () => {
    server.use(http.post(url, errorWith(401)));
    await expect(fetchRefresh("t", call)).resolves.toEqual({
      kind: "ended",
      reason: "INVALID_CREDENTIALS",
    });
  });

  it.each([500, 502, 503, 429])(
    "keeps the session when identity answers %i",
    async (status) => {
      server.use(http.post(url, errorWith(status)));
      await expect(fetchRefresh("t", call)).resolves.toEqual({
        kind: "unavailable",
      });
    },
  );

  it("keeps the session on a network error", async () => {
    server.use(http.post(url, () => HttpResponse.error()));
    await expect(fetchRefresh("t", call)).resolves.toEqual({
      kind: "unavailable",
    });
  });

  it("keeps the session when a 200 has no tokens", async () => {
    server.use(
      http.post(url, () => HttpResponse.json({ timestamp: "t", data: {} })),
    );
    await expect(fetchRefresh("t", call)).resolves.toEqual({
      kind: "unavailable",
    });
  });
});
