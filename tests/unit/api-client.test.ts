import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { REQUESTED_WITH, createApiClient, unwrap } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { meFixture } from "../msw/handlers";
import { server } from "../msw/server";

const BASE = "http://localhost:3000/api/id";
const client = createApiClient(BASE);

function envelope<T>(data: T) {
  return { timestamp: "2026-11-10T00:00:00Z", data };
}

describe("api client", () => {
  it("calls the BFF proxy without the /v1 prefix and sends the CSRF header", async () => {
    let seen: { path: string; header: string | null } | undefined;
    server.use(
      http.get(`${BASE}/me`, ({ request }) => {
        seen = {
          path: new URL(request.url).pathname,
          header: request.headers.get("x-requested-with"),
        };
        return HttpResponse.json(envelope(meFixture));
      }),
    );
    const me = await unwrap(client.GET("/me"));
    expect(me).toEqual(meFixture);
    expect(seen).toEqual({ path: "/api/id/me", header: REQUESTED_WITH });
  });

  it("returns undefined for a 204", async () => {
    server.use(
      http.delete(
        `${BASE}/me/sessions/:id`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    await expect(
      unwrap(
        client.DELETE("/me/sessions/{id}", {
          params: { path: { id: "s1" } },
        }),
      ),
    ).resolves.toBeUndefined();
  });

  it("throws ApiError with reason, fields, retry delay and request ID", async () => {
    server.use(
      http.patch(`${BASE}/me`, () =>
        HttpResponse.json(
          {
            timestamp: "2026-11-10T00:00:00Z",
            error: {
              code: "ERR_UNPROCESSABLE",
              message: "Validation failed",
              meta: {
                reason: "PASSWORD_POLICY",
                fields: { display_name: "is too long" },
                retry_after: 30,
              },
            },
          },
          { status: 422, headers: { "X-Request-Id": "req-1" } },
        ),
      ),
    );
    const error = await unwrap(
      client.PATCH("/me", { body: { display_name: "x" } }),
    ).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: "ERR_UNPROCESSABLE",
      message: "Validation failed",
      reason: "PASSWORD_POLICY",
      fields: { display_name: "is too long" },
      retryAfter: 30,
      requestId: "req-1",
    });
  });

  it("reads SESSION_ENDED and its cause", async () => {
    server.use(
      http.get(`${BASE}/me`, () =>
        HttpResponse.json(
          {
            timestamp: "2026-11-10T00:00:00Z",
            error: {
              code: "ERR_UNAUTHORIZED",
              message: "The session has ended.",
              meta: { reason: "SESSION_ENDED", cause: "REFRESH_REUSED" },
            },
          },
          { status: 401 },
        ),
      ),
    );
    const error = await unwrap(client.GET("/me")).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).isSessionEnded).toBe(true);
    expect((error as ApiError).sessionEndCause).toBe("REFRESH_REUSED");
  });

  it("takes the retry delay from Retry-After when meta has none", async () => {
    server.use(
      http.get(`${BASE}/me`, () =>
        HttpResponse.json(
          {
            timestamp: "2026-11-10T00:00:00Z",
            error: {
              code: "ERR_TOO_MANY_REQUESTS",
              message: "Slow down",
              meta: { reason: "RATE_LIMITED" },
            },
          },
          { status: 429, headers: { "Retry-After": "12" } },
        ),
      ),
    );
    const error = await unwrap(client.GET("/me")).catch(
      (caught: unknown) => caught,
    );
    expect(error).toMatchObject({ reason: "RATE_LIMITED", retryAfter: 12 });
  });

  it("throws ApiError with only the status for a body that is not an envelope", async () => {
    server.use(
      http.get(
        `${BASE}/me`,
        () =>
          new HttpResponse("<html>Bad gateway</html>", {
            status: 502,
            headers: { "Content-Type": "text/html" },
          }),
      ),
    );
    const error = await unwrap(client.GET("/me")).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 502,
      reason: undefined,
      fields: {},
    });
  });
});
