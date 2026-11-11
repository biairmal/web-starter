import { expect, expectNoA11yViolations, test } from "../fixtures";
import { MOCK_PASSWORD } from "../mock-users";
import { signIn } from "../session";

// Sign in with a password and the tenant picker (APP_FLOW 5.1, 5.2; FE-1,
// FE-2, FE-8, FE-10). Accounts come from tests/e2e/mock-users.ts.

test.describe("sign in", () => {
  test("FE-2 signs in and lands on next, with httpOnly cookies", async ({
    page,
    context,
  }) => {
    await page.goto("/admin/users?page=2");
    await expect(page).toHaveURL("/sign-in?next=%2Fadmin%2Fusers%3Fpage%3D2");
    await expect(
      page.getByRole("heading", { level: 1, name: "Sign in to Acme Portal" }),
    ).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByLabel("Email").fill("dina@example.test");
    await page.getByLabel("Password", { exact: true }).fill(MOCK_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    // The mock user holds no users:read, so the page answers 403 in the shell.
    await expect(page).toHaveURL("/admin/users?page=2");
    await expect(
      page.getByRole("button", { name: /Open account menu/ }),
    ).toContainText("Dina Pratama");

    const cookies = await context.cookies();
    for (const name of ["__Host-ws_at", "__Host-ws_rt"]) {
      const cookie = cookies.find((entry) => entry.name === name);
      expect(cookie, name).toBeDefined();
      expect(cookie?.httpOnly).toBe(true);
      expect(cookie?.secure).toBe(true);
    }
    const scripts = await page.evaluate(() => document.cookie);
    expect(scripts).not.toContain("__Host-ws");
  });

  test("FE-2 shows the generic error for a wrong password", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("dina@example.test");
    await page.getByLabel("Password", { exact: true }).fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Email or password is incorrect." }),
    ).toBeVisible();
    await expect(page).toHaveURL("/sign-in");
    await expectNoA11yViolations(page);
  });

  test("FE-10 shows the minutes to wait for a locked account", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("locked@example.test");
    await page.getByLabel("Password", { exact: true }).fill(MOCK_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Too many attempts. Try again in 14 minutes." }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Try again in \d+ seconds/ }),
    ).toBeDisabled();
  });

  test("FE-8 asks for a tenant, then signs in to it", async ({ page }) => {
    await page.goto("/sign-in?next=%2F");
    await page.getByLabel("Email").fill("multi@example.test");
    await page.getByLabel("Password", { exact: true }).fill(MOCK_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/sign-in/tenant");
    await expect(
      page.getByRole("heading", { level: 1, name: "Choose a workspace" }),
    ).toBeVisible();
    await expect(page).toHaveTitle("Choose a workspace · Acme Portal");
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: /Globex/ }).click();

    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("button", { name: /Open account menu/ }),
    ).toContainText("Multi Tenant");
  });

  test("the tenant picker sends a reload back to sign-in with the email kept", async ({
    page,
  }) => {
    await page.goto("/sign-in?next=%2Fadmin%2Fusers");
    await page.getByLabel("Email").fill("multi@example.test");
    await page.getByLabel("Password", { exact: true }).fill(MOCK_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/sign-in/tenant");

    await page.reload();
    await expect(page).toHaveURL("/sign-in?next=%2Fadmin%2Fusers");
    await expect(page.getByLabel("Email")).toHaveValue("multi@example.test");
    await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  });

  test("FE-7 a forced password change goes to /change-password", async ({
    page,
    context,
  }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("change@example.test");
    await page.getByLabel("Password", { exact: true }).fill(MOCK_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/change-password");
    const names = (await context.cookies()).map((cookie) => cookie.name);
    expect(names).toContain("__Host-ws_pc");
    expect(names).not.toContain("__Host-ws_rt");
  });

  test("a signed-in user visiting /sign-in goes to /", async ({
    page,
    context,
  }) => {
    await signIn(context);
    await page.goto("/sign-in");
    await expect(page).toHaveURL("/");
  });

  test("an ended session shows why on the sign-in page", async ({ page }) => {
    await page.goto("/sign-in?reason=REFRESH_REUSED");
    await expect(page.getByRole("status").first()).toHaveText(
      "You were signed out to keep your account safe. Sign in to continue.",
    );
    await expectNoA11yViolations(page);
  });
});
