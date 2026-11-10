import { expect, expectNoA11yViolations, test } from "../fixtures";
import { signIn } from "../session";

// The signed-in shell, navigation gating and the server permission gate
// (TRD 6.2, 9; APP_FLOW 2). /v1/me comes from tests/e2e/mock-identity.mts.

test.describe("signed-in shell", () => {
  test("FE-30 shows the home page with the user's tenant and roles", async ({
    page,
    context,
  }) => {
    await signIn(context, { name: "Dina Pratama", roles: ["Manager"] });
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Acme Portal" }),
    ).toBeVisible();
    await expect(
      page.getByText("You are signed in to Acme as Manager."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Open account menu/ }),
    ).toContainText("Dina Pratama");
    await expectNoA11yViolations(page);
  });

  test("a user with users:read sees the Users link and opens the page", async ({
    page,
    context,
  }) => {
    await signIn(context, { perms: ["users:read"] });
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("heading", { name: "Admin" })).toBeVisible();
    await nav.getByRole("link", { name: "Users" }).click();
    await expect(page).toHaveURL("/admin/users");
    await expect(
      page.getByRole("heading", { level: 1, name: "Users" }),
    ).toBeVisible();
    await expect(nav.getByRole("link", { name: "Users" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expectNoA11yViolations(page);
  });

  test("a user without users:read sees no Users link and gets 403 on /admin/users", async ({
    page,
    context,
  }) => {
    await signIn(context, { perms: ["notes:read"] });
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Users" })).toHaveCount(0);
    await expect(nav.getByRole("heading", { name: "Admin" })).toHaveCount(0);

    const response = await page.goto("/admin/users");
    expect(response?.status()).toBe(403);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "You don’t have permission to view this",
      }),
    ).toBeVisible();
    // The shell stays, so the user is not stranded.
    await expect(
      page.getByRole("button", { name: /Open account menu/ }),
    ).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("the super admin passes every permission check", async ({
    page,
    context,
  }) => {
    await signIn(context, { sa: true, perms: [] });
    const response = await page.goto("/admin/users");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: "Users" }),
    ).toBeVisible();
  });

  test("a revoked session is cleared and sent to sign-in with next", async ({
    page,
    context,
  }) => {
    await signIn(context, { revoked: true });
    await page.goto("/admin/users?page=2");
    await expect(page).toHaveURL(
      "/sign-in?reason=REFRESH_REUSED&next=%2Fadmin%2Fusers%3Fpage%3D2",
    );
    const names = (await context.cookies()).map((cookie) => cookie.name);
    expect(names).not.toContain("__Host-ws_at");
    expect(names).not.toContain("__Host-ws_rt");
  });
});

test.describe("at 375px", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("the sidebar becomes a drawer that navigates and closes", async ({
    page,
    context,
  }) => {
    await signIn(context, { perms: ["users:read"] });
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
    await page.getByRole("button", { name: "Open menu" }).click();
    const drawer = page.getByRole("dialog", { name: "Menu" });
    await expect(drawer).toBeVisible();
    await expectNoA11yViolations(page);
    await drawer.getByRole("link", { name: "Users" }).click();
    await expect(page).toHaveURL("/admin/users");
    await expect(drawer).toBeHidden();
    await expect(
      page.getByRole("heading", { level: 1, name: "Users" }),
    ).toBeVisible();
  });

  test("the page does not scroll sideways", async ({ page, context }) => {
    await signIn(context);
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
