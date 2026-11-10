import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "@/config/env";
import { CSRF_HEADER, CSRF_HEADER_VALUE, passesCsrf } from "@/lib/bff/csrf";
import { BffError, reasonOf } from "@/lib/bff/envelope";
import { BODY_LIMIT_BYTES, readLimitedBody, withBff } from "@/lib/bff/route";
import { cookieNames, sealSessionCookies } from "@/lib/session/cookies";
import { tokenResponse } from "../helpers/tokens";

const APP = "http://localhost:3000";
const ok = () => Promise.resolve(NextResponse.json({ data: { ok: true } }));

function post(
  headers: Record<string, string> = {},
  body?: BodyInit,
): NextRequest {
  return new NextRequest(`${APP}/api/thing`, { method: "POST", headers, body });
}

const goodHeaders = { origin: APP, [CSRF_HEADER]: CSRF_HEADER_VALUE };

async function errorOf(res: Response) {
  const body = (await res.json()) as {
    error: { code: string; meta?: Record<string, unknown> };
  };
  return body.error;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("withBff CSRF check", () => {
  const route = withBff(ok, { csrf: true, session: "none" });

  it("rejects a POST without an Origin", async () => {
    const res = await route(post({ [CSRF_HEADER]: CSRF_HEADER_VALUE }), {});
    expect(res.status).toBe(403);
    expect(await errorOf(res)).toMatchObject({
      meta: { reason: "CSRF_FAILED" },
    });
  });

  it("rejects a POST from another origin", async () => {
    const res = await route(
      post({
        origin: "https://evil.example",
        [CSRF_HEADER]: CSRF_HEADER_VALUE,
      }),
      {},
    );
    expect(res.status).toBe(403);
    expect(await errorOf(res)).toMatchObject({
      meta: { reason: "CSRF_FAILED" },
    });
  });

  it("rejects a POST without the X-Requested-With header", async () => {
    const res = await route(post({ origin: APP }), {});
    expect(res.status).toBe(403);
    expect(await errorOf(res)).toMatchObject({
      meta: { reason: "CSRF_FAILED" },
    });
  });

  it("rejects a POST with the wrong X-Requested-With value", async () => {
    const res = await route(
      post({ origin: APP, [CSRF_HEADER]: "XMLHttpRequest" }),
      {},
    );
    expect(res.status).toBe(403);
  });

  it("accepts a POST with the right Origin and header", async () => {
    const res = await route(post(goodHeaders), {});
    expect(res.status).toBe(200);
  });

  it("does not check GET requests", async () => {
    const res = await route(new NextRequest(`${APP}/api/thing`), {});
    expect(res.status).toBe(200);
  });

  it("checks every mutating method", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(passesCsrf(method, new Headers(), APP)).toBe(false);
    }
    expect(passesCsrf("HEAD", new Headers(), APP)).toBe(true);
  });

  it("skips the check when the route turns it off", async () => {
    const open = withBff(ok, { csrf: false, session: "none" });
    expect((await open(post(), {})).status).toBe(200);
  });
});

describe("withBff response conventions", () => {
  it("sets Cache-Control: no-store and a new X-Request-Id", async () => {
    const route = withBff(ok, { csrf: false, session: "none" });
    const request = new NextRequest(`${APP}/api/thing`, {
      headers: { "x-request-id": "forged" },
    });
    const res = await route(request, {});
    expect(res.headers.get("cache-control")).toBe("no-store");
    const id = res.headers.get("x-request-id");
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(id).not.toBe("forged");
  });

  it("gives the handler the same request ID it returns", async () => {
    let seen = "";
    const route = withBff(
      (ctx) => {
        seen = ctx.requestId;
        return ok();
      },
      { csrf: false, session: "none" },
    );
    const res = await route(new NextRequest(`${APP}/api/thing`), {});
    expect(res.headers.get("x-request-id")).toBe(seen);
  });

  it("turns a thrown BffError into the envelope", async () => {
    const route = withBff(
      () => Promise.reject(BffError.upstreamUnavailable()),
      {
        csrf: false,
        session: "none",
      },
    );
    const res = await route(new NextRequest(`${APP}/api/thing`), {});
    expect(res.status).toBe(503);
    const body = (await res.json()) as { timestamp: string };
    expect(body.timestamp).toEqual(expect.any(String));
    expect(reasonOf(body)).toBe("UPSTREAM_UNAVAILABLE");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("turns an unexpected error into a 500 envelope without its message", async () => {
    const route = withBff(() => Promise.reject(new Error("secret detail")), {
      csrf: false,
      session: "none",
    });
    const res = await route(new NextRequest(`${APP}/api/thing`), {});
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).toContain("ERR_INTERNAL");
    expect(text).not.toContain("secret detail");
  });

  it("puts cookies the handler set on the response", async () => {
    const route = withBff(
      (ctx) => {
        ctx.cookies.set("__Host-ws_x", "1", {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          maxAge: 10,
        });
        return ok();
      },
      { csrf: false, session: "none" },
    );
    const res = await route(new NextRequest(`${APP}/api/thing`), {});
    expect(res.headers.getSetCookie().join("\n")).toMatch(/__Host-ws_x=1/);
  });
});

describe("withBff session modes", () => {
  it("answers 401 SESSION_ENDED with cause NO_SESSION and clears cookies when a session is required", async () => {
    const handler = vi.fn(ok);
    const route = withBff(handler, { csrf: false, session: "required" });
    const res = await route(new NextRequest(`${APP}/api/thing`), {});
    expect(res.status).toBe(401);
    expect(await errorOf(res)).toMatchObject({
      meta: { reason: "SESSION_ENDED", cause: "NO_SESSION" },
    });
    expect(handler).not.toHaveBeenCalled();
    const setCookies = res.headers.getSetCookie().join("\n");
    for (const name of Object.values(cookieNames())) {
      expect(setCookies).toContain(`${name}=;`);
    }
  });

  it("passes the session to the handler", async () => {
    const specs = await sealSessionCookies(tokenResponse({ sid: "family-3" }));
    const cookie = specs
      .filter((s) => s.value)
      .map((s) => `${s.name}=${s.value}`)
      .join("; ");
    let sessionId: string | undefined;
    const route = withBff(
      (ctx) => {
        sessionId = ctx.session.sessionId;
        return ok();
      },
      { csrf: false, session: "required" },
    );
    const res = await route(
      new NextRequest(`${APP}/api/thing`, { headers: { cookie } }),
      {},
    );
    expect(res.status).toBe(200);
    expect(sessionId).toBe("family-3");
  });

  it("gives null for an optional session that is absent", async () => {
    let seen: unknown = "unset";
    const route = withBff(
      (ctx) => {
        seen = ctx.session;
        return ok();
      },
      { csrf: false, session: "optional" },
    );
    await route(new NextRequest(`${APP}/api/thing`), {});
    expect(seen).toBeNull();
  });
});

describe("body limit", () => {
  it("rejects a Content-Length over 1 MiB with 413", async () => {
    const route = withBff(ok, { csrf: true, session: "none" });
    const res = await route(
      post({ ...goodHeaders, "content-length": String(BODY_LIMIT_BYTES + 1) }),
      {},
    );
    expect(res.status).toBe(413);
  });

  it("stops reading a body without a length once it passes the limit", async () => {
    const big = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(BODY_LIMIT_BYTES));
        controller.enqueue(new Uint8Array(1));
        controller.close();
      },
    });
    const request = new Request(`${APP}/api/thing`, {
      method: "POST",
      body: big,
      // @ts-expect-error -- Node needs duplex for a streamed request body.
      duplex: "half",
    });
    await expect(readLimitedBody(request)).rejects.toMatchObject({
      status: 413,
    });
  });

  it("reads a body under the limit", async () => {
    const body = await readLimitedBody(post({}, "hello"));
    expect(new TextDecoder().decode(body)).toBe("hello");
    await expect(
      readLimitedBody(new Request(`${APP}/api/thing`)),
    ).resolves.toBeUndefined();
  });
});

describe("request log", () => {
  it("writes one JSON line without the body, query or cookies", async () => {
    const previous = env.LOG_LEVEL;
    (env as { LOG_LEVEL: string }).LOG_LEVEL = "info";
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line: unknown) => {
      lines.push(String(line));
    });
    try {
      const route = withBff(ok, { csrf: true, session: "none" });
      await route(
        new NextRequest(`${APP}/api/thing?email=user%40example.com`, {
          method: "POST",
          headers: { ...goodHeaders, cookie: "__Host-ws_at=secret-cookie" },
          body: JSON.stringify({ password: "hunter2-password" }),
        }),
        {},
      );
    } finally {
      (env as { LOG_LEVEL: string }).LOG_LEVEL = previous;
    }
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0] ?? "{}") as Record<string, unknown>;
    expect(entry).toMatchObject({
      level: "info",
      method: "POST",
      route: "/api/thing",
      status: 200,
    });
    expect(typeof entry.request_id).toBe("string");
    expect(typeof entry.duration_ms).toBe("number");
    const raw = lines[0] ?? "";
    expect(raw).not.toContain("hunter2");
    expect(raw).not.toContain("example.com");
    expect(raw).not.toContain("secret-cookie");
  });
});
