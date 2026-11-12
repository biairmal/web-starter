import { http, HttpResponse, delay } from "msw";
import { describe, expect, it } from "vitest";
import { GET as healthz } from "@/app/api/healthz/route";
import { GET as readyz } from "@/app/api/readyz/route";
import { server } from "../msw/server";

// Health endpoints (TRD 14; FE-NFR-7).

const IDENTITY = "http://identity.test";

describe("GET /api/healthz", () => {
  it("answers 200 without calling identity", async () => {
    const response = healthz();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ data: { status: "ok" } });
  });
});

describe("GET /api/readyz", () => {
  it("answers 200 while identity is ready", async () => {
    server.use(
      http.get(`${IDENTITY}/readyz`, () => HttpResponse.json({ ok: true })),
    );
    const response = await readyz();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: { status: "ready" },
    });
  });

  it("fails with 503 UPSTREAM_UNAVAILABLE when identity is not ready", async () => {
    server.use(
      http.get(
        `${IDENTITY}/readyz`,
        () => new HttpResponse(null, { status: 503 }),
      ),
    );
    const response = await readyz();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      error: { meta: { reason: "UPSTREAM_UNAVAILABLE" } },
    });
  });

  it("fails when identity is down", async () => {
    server.use(http.get(`${IDENTITY}/readyz`, () => HttpResponse.error()));
    expect((await readyz()).status).toBe(503);
  });

  it("fails when identity takes longer than one second", async () => {
    server.use(
      http.get(`${IDENTITY}/readyz`, async () => {
        await delay(1500);
        return HttpResponse.json({ ok: true });
      }),
    );
    const started = Date.now();
    expect((await readyz()).status).toBe(503);
    expect(Date.now() - started).toBeLessThan(1400);
  });
});
