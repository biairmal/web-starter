import { expect, expectNoA11yViolations, test } from "../fixtures";
import { MOCK_GOOD_TOKEN, MOCK_PASSWORD } from "../mock-users";
import { brand } from "@/config/brand";

// Sign up, check email and verify (APP_FLOW 5.4; FE-4, FE-5). The mock
// identity answers 202 to every registration, as identity does for a new and
// an existing address alike.

test.describe("sign up", () => {
  test("FE-4 signs up with live password rules and lands on check email", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByRole("link", { name: "Create an account" }).click();
    await expect(page).toHaveURL("/sign-up");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: `Create your ${brand.appName} account`,
      }),
    ).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByLabel("Name").fill("Rina Wijaya");
    await page.getByLabel("Email").fill("rina@example.test");
    const password = page.getByLabel("Password", { exact: true });
    await password.fill("short");
    const minRule = page.getByRole("listitem").filter({
      hasText: "At least 10 characters",
    });
    await expect(minRule).toHaveAttribute("data-met", "false");
    await password.fill("violet-orchard-ferry");
    await expect(minRule).toHaveAttribute("data-met", "true");

    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/sign-up/check-email");
    await expect(
      page.getByRole("heading", { level: 1, name: "Check your email" }),
    ).toBeVisible();
    await expect(page.getByText("rina@example.test")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Resend in \d+ seconds/ }),
    ).toBeDisabled();
    await expectNoA11yViolations(page);
  });

  test("FE-4 refuses a short password before calling the server", async ({
    page,
  }) => {
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Rina Wijaya");
    await page.getByLabel("Email").fill("rina@example.test");
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
    await expect(page).toHaveURL("/sign-up");
  });
});

test.describe("verify email", () => {
  test("FE-5 verifies and removes the token from the URL", async ({ page }) => {
    await page.goto(`/verify-email#token=${MOCK_GOOD_TOKEN}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Email verified" }),
    ).toBeVisible();
    expect(new URL(page.url()).hash).toBe("");
    expect(page.url()).toBe("http://localhost:3000/verify-email");
    await expectNoA11yViolations(page);
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/sign-in");
  });

  test("FE-5 an expired link shows the expired state with resend", async ({
    page,
  }) => {
    const response = await page.goto("/verify-email#token=used-token");
    expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "This link has expired or was already used",
      }),
    ).toBeVisible();
    expect(new URL(page.url()).hash).toBe("");
    await expectNoA11yViolations(page);

    await page.getByLabel("Email").fill("rina@example.test");
    await page.getByRole("button", { name: "Resend email" }).click();
    await expect(
      page.getByText("If that address needs verifying, we’ve sent a new link."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Resend in \d+ seconds/ }),
    ).toBeDisabled();
  });

  test("signing in unverified offers to resend the email", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("new@example.test");
    await page.getByLabel("Password", { exact: true }).fill(MOCK_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Verify your email to sign in.")).toBeVisible();
    await page.getByRole("button", { name: "Resend email" }).click();
    await expect(
      page.getByRole("button", { name: /Resend in \d+ seconds/ }),
    ).toBeDisabled();
  });
});
