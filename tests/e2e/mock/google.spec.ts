import { expect, expectNoA11yViolations, test } from "../fixtures";
import { MOCK_GOOD_TOKEN } from "../mock-users";

// Continue with Google (APP_FLOW 5.3, FE-3). The redirect to Google is not
// followed here (Prism is not a provider); the start and callback halves are
// checked on either side of it.

test.describe("Google sign-in", () => {
  test("FE-3 the button starts at the BFF and keeps next", async ({
    page,
    request,
  }) => {
    await page.goto("/sign-in?next=%2Fadmin%2Fusers");
    const button = page.getByRole("link", { name: "Continue with Google" });
    await expect(button).toHaveAttribute(
      "href",
      "/api/auth/google/start?next=%2Fadmin%2Fusers",
    );
    await expect(page.getByText("or", { exact: true })).toBeVisible();
    await expectNoA11yViolations(page);

    const start = await request.get(
      "/api/auth/google/start?next=%2Fadmin%2Fusers",
      { maxRedirects: 0 },
    );
    expect(start.status()).toBe(302);
    const location = new URL(start.headers().location ?? "");
    expect(location.origin).toBe("http://localhost:4010");
    expect(location.pathname).toBe("/v1/auth/google/start");
    expect(location.searchParams.get("redirect_to")).toBe(
      "http://localhost:3000/auth/callback",
    );
    expect(start.headers()["set-cookie"]).toMatch(/__Host-ws_next=/);
  });

  test("FE-3 the callback exchanges the code and lands on next", async ({
    page,
    context,
  }) => {
    // The start route sets the return path, as the button would.
    const start = await page.request.get(
      "/api/auth/google/start?next=%2Fadmin%2Fusers",
      { maxRedirects: 0 },
    );
    expect(start.status()).toBe(302);

    await page.goto(`/auth/callback?code=${MOCK_GOOD_TOKEN}`);
    await expect(page).toHaveURL("/admin/users");
    await expect(
      page.getByRole("button", { name: /Open account menu/ }),
    ).toContainText("Gina Google");
    const names = (await context.cookies()).map((cookie) => cookie.name);
    expect(names).toContain("__Host-ws_at");
    expect(names).not.toContain("__Host-ws_next");
  });

  test("FE-3 an error comes back to sign-in with the reason", async ({
    page,
  }) => {
    await page.goto("/auth/callback?error=OAUTH_DOMAIN_NOT_ALLOWED");
    await expect(page).toHaveURL("/sign-in?reason=OAUTH_DOMAIN_NOT_ALLOWED");
    await expect(page.getByRole("status").first()).toHaveText(
      "Google sign-in did not complete. Try again or use your password.",
    );
  });

  test("FE-3 a used code reads as Google not completing", async ({ page }) => {
    await page.goto("/auth/callback?code=used-code");
    await expect(page).toHaveURL("/sign-in?reason=OAUTH_STATE_INVALID");
  });
});
