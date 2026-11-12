import { expect, test } from "../fixtures";
import {
  createAccount,
  login,
  nextMailLink,
  pathOf,
  signInWithPassword,
  tenancy,
} from "./support";

// APP_FLOW 5.5: forgot and reset password (FE-6).

test.skip(tenancy !== "single", "single-mode journey");

test("FE-6 resets from the mailed link, signs out every device and signs in with the new password", async ({
  browser,
  page,
}) => {
  const account = await createAccount("reset", ["member"]);
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await signInWithPassword(otherPage, account);

  await page.goto("/sign-in");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL("/forgot-password");
  await page.getByLabel("Email").fill(account.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(/If that address has an account/)).toBeVisible();

  const link = await nextMailLink(account.email, "reset_password");
  expect(new URL(link).pathname).toBe("/reset-password");
  await page.goto(pathOf(link));
  await expect(
    page.getByRole("heading", { level: 1, name: "Choose a new password" }),
  ).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
  const newPassword = "e2e-reset-saffron-lagoon";
  await page.getByLabel("New password").fill(newPassword);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page).toHaveURL("/sign-in?reason=PASSWORD_RESET");
  await expect(
    page.getByText("Password changed. Sign in with your new password."),
  ).toBeVisible();

  await expect(login(account.email, account.password)).rejects.toThrow();
  await signInWithPassword(page, {
    email: account.email,
    password: newPassword,
  });

  // The other device's session ended with the reset.
  await expect(async () => {
    await otherPage.goto("/account");
    await expect(otherPage).toHaveURL(/\/sign-in/);
  }).toPass({ timeout: 120_000, intervals: [5_000] });
  await other.close();

  // The link works once.
  await page.goto("about:blank");
  await page.goto(pathOf(link));
  await page.getByLabel("New password").fill("e2e-reset-another-one-9");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(
    page.getByRole("link", { name: "Send a new link" }),
  ).toBeVisible();
});
