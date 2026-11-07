import { describe, expect, it } from "vitest";
import { authConfigFixture } from "../msw/handlers";

describe("MSW handlers", () => {
  it("serve the auth config fixture on identity's /v1/auth/config path", async () => {
    const response = await fetch("http://identity.test/v1/auth/config");
    const body = (await response.json()) as { data: unknown };
    expect(body.data).toEqual(authConfigFixture);
  });
});
