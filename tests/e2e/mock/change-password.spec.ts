import type { Page } from "@playwright/test";
import { expect, expectNoA11yViolations, test } from "../fixtures";
import { MOCK_COMMON_PASSWORD, MOCK_PASSWORD } from "../mock-users";
import { signIn } from "../session";

// Forced password change and sign out (APP_FLOW 5.6, 5.9; FE-7, FE-22).

async function signInForcedChange(page: Page, next = "/") {
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill("change@example.test");
  await page.getByLabel("Password", { exact: true }).fill(MOCK_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/change-password");
  // Acting before the page hydrates would race the form's handlers.
  await page.waitForLoadState("networkidle");
}

/** A native submit must never put a secret in the URL. */
function expectNoSecretInUrl(page: Page) {
  expect(new URL(page.url()).search).toBe("");
}

test.describe("forced password change", () => {
  test("FE-7 confines the user to /change-password", async ({ page }) => {
    await signInForcedChange(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "Choose a new password" }),
    ).toBeVisible();
    // No navigation: only the form and sign-out.
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await expectNoA11yViolations(page);

    await page.goto("/admin/users");
    await expect(page).toHaveURL("/change-password");
    const api = await page.evaluate(async () => {
      const response = await fetch("/api/id/me");
      return response.status;
    });
    expect(api).toBe(403);
  });

  test("FE-7 a new password replaces the cookies and lands on next", async ({
    page,
    context,
  }) => {
    await signInForcedChange(page, "/admin/users");
    await page.getByLabel("New password").fill(MOCK_COMMON_PASSWORD);
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(
      page.getByText("This password is too common. Choose another."),
    ).toBeVisible();
    expectNoSecretInUrl(page);

    await page.getByLabel("New password").fill("granite-harbor-root");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page).toHaveURL("/admin/users");
    const names = (await context.cookies()).map((cookie) => cookie.name);
    expect(names).toContain("__Host-ws_at");
    expect(names).toContain("__Host-ws_rt");
    expect(names).not.toContain("__Host-ws_pc");
  });

  test("FE-7 a restricted user can sign out", async ({ page, context }) => {
    await signInForcedChange(page);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/sign-in");
    expect(await context.cookies()).toEqual([]);
  });

  test("a signed-in user is sent to the account page", async ({
    page,
    context,
  }) => {
    await signIn(context);
    await page.goto("/change-password");
    await expect(page).toHaveURL("/account");
  });
});

test.describe("sign out", () => {
  test("FE-22 signs out from the user menu and clears the cookies", async ({
    page,
    context,
  }) => {
    await signIn(context, { name: "Dina Pratama" });
    await page.goto("/");
    await page.getByRole("button", { name: /Open account menu/ }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/sign-in");
    const names = (await context.cookies()).map((cookie) => cookie.name);
    expect(names).not.toContain("__Host-ws_at");
    expect(names).not.toContain("__Host-ws_rt");

    await page.goto("/");
    await expect(page).toHaveURL("/sign-in?next=%2F");
  });

  test("FE-22 other tabs follow on their next action", async ({ context }) => {
    await signIn(context);
    const tabA = await context.newPage();
    const tabB = await context.newPage();
    await tabA.goto("/");
    await tabB.goto("/");

    await tabA.getByRole("button", { name: /Open account menu/ }).click();
    await tabA.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(tabA).toHaveURL("/sign-in");

    await expect(tabB).toHaveURL("/");
    await tabB.getByRole("heading", { level: 1 }).click();
    await expect(tabB).toHaveURL("/sign-in?next=%2F");
  });
});

test.describe("before the page's scripts run", () => {
  test.use({ javaScriptEnabled: false });

  test("a submitted password never reaches the URL", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("dina@example.test");
    await page.getByLabel("Password", { exact: true }).fill("secret-in-form");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForLoadState("load");
    expect(page.url()).not.toContain("secret-in-form");
    expectNoSecretInUrl(page);
  });
});
