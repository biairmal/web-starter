import { expect, expectNoA11yViolations, test } from "../fixtures";
import { MOCK_COMMON_PASSWORD, MOCK_GOOD_TOKEN } from "../mock-users";
import { signIn } from "../session";

// Forgot and reset password (APP_FLOW 5.5, FE-6).

test.describe("forgot password", () => {
  test("FE-6 always shows the same confirmation", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL("/forgot-password");
    await expectNoA11yViolations(page);

    for (const email of ["dina@example.test", "nobody@example.test"]) {
      await page.goto("/forgot-password");
      await page.getByLabel("Email").fill(email);
      await page.getByRole("button", { name: "Send reset link" }).click();
      await expect(
        page.getByText(
          "If that address has an account, we’ve sent a reset link. It works once and expires soon.",
        ),
      ).toBeVisible();
    }
  });
});

test.describe("reset password", () => {
  test("FE-6 resets, clears the session and confirms on sign-in", async ({
    page,
    context,
  }) => {
    await signIn(context);
    const response = await page.goto(
      `/reset-password#token=${MOCK_GOOD_TOKEN}`,
    );
    expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
    await expect(
      page.getByRole("heading", { level: 1, name: "Choose a new password" }),
    ).toBeVisible();
    expect(page.url()).toBe("http://localhost:3000/reset-password");
    await expect(
      page.getByText("This signs you out on all your devices."),
    ).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByLabel("New password").fill("copper-meadow-signal");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page).toHaveURL("/sign-in?reason=PASSWORD_RESET");
    await expect(
      page.getByText("Password changed. Sign in with your new password."),
    ).toBeVisible();
    const names = (await context.cookies()).map((cookie) => cookie.name);
    expect(names).not.toContain("__Host-ws_at");
    expect(names).not.toContain("__Host-ws_rt");
    await expectNoA11yViolations(page);
  });

  test("FE-6 shows the policy error on the field", async ({ page }) => {
    await page.goto(`/reset-password#token=${MOCK_GOOD_TOKEN}`);
    await page.getByLabel("New password").fill(MOCK_COMMON_PASSWORD);
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(
      page.getByText("This password is too common. Choose another."),
    ).toBeVisible();
    await expect(page.getByLabel("New password")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("FE-6 a used link offers a new one", async ({ page }) => {
    await page.goto("/reset-password#token=used-token");
    await page.getByLabel("New password").fill("copper-meadow-signal");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "This link has expired or was already used",
      }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Send a new link" }).click();
    await expect(page).toHaveURL("/forgot-password");
  });
});
