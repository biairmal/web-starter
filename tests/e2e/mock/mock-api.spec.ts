import { expect, test } from "../fixtures";
import { PRISM_ORIGIN } from "../env";

// FE-63: UI work runs against a mock API served from the OpenAPI file
// (`pnpm mock`, Prism), so it does not wait for the backend.

test("FE-63 the mock API answers identity's endpoints from openapi/identity.yaml", async ({
  request,
}) => {
  const response = await request.get(`${PRISM_ORIGIN}/v1/auth/config`);
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    data?: { providers?: { password?: unknown } };
  };
  expect(typeof body.data?.providers?.password).toBe("boolean");
});
