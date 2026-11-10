import { expect, test } from "../fixtures";

// The mock project runs the app with IDENTITY_PUBLIC_URL=http://localhost:4010.

test("/sign-in sends the TRD 11.2 security headers with a per-request CSP nonce", async ({
  page,
}) => {
  const first = await page.request.get("/sign-in");
  const second = await page.request.get("/sign-in");
  const headers = first.headers();

  const csp = headers["content-security-policy"] ?? "";
  expect(csp).toMatch(
    /script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/,
  );
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("form-action 'self' http://localhost:4010");
  expect(csp).toContain("base-uri 'self'");
  expect(second.headers()["content-security-policy"]).not.toBe(csp);

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toBe(
    "camera=(), microphone=(), geolocation=()",
  );
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("fragment-token pages send no referrer", async ({ page }) => {
  for (const path of ["/verify-email", "/reset-password", "/invite"]) {
    const res = await page.request.get(path);
    expect(res.headers()["referrer-policy"], path).toBe("no-referrer");
  }
});

test("the inline theme script runs under the CSP", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    /^(light|dark)$/,
  );
});
