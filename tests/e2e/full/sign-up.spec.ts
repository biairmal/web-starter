import { expect, test } from "../fixtures";
import {
  PASSWORD,
  mailLinks,
  nextMailLink,
  pathOf,
  signInWithPassword,
  uniqueEmail,
  uniqueName,
  tenancy,
} from "./support";

// APP_FLOW 5.4: sign up, the verification mail, verify (FE-4, FE-5).

test.skip(tenancy !== "single", "single-mode journey");

test("FE-4 FE-5 signs up, verifies from the mailed link and signs in", async ({
  page,
}) => {
  const email = uniqueEmail("signup");
  await page.goto("/sign-in");
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page).toHaveURL("/sign-up");
  await page.getByLabel("Name").fill(uniqueName("Rina"));
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/sign-up/check-email");
  await expect(
    page.getByRole("heading", { level: 1, name: "Check your email" }),
  ).toBeVisible();

  // Not verified yet: sign-in says so.
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Verify your email to sign in.")).toBeVisible();

  const link = await nextMailLink(email, "verify_email");
  expect(new URL(link).pathname).toBe("/verify-email");
  await page.goto(pathOf(link));
  await expect(
    page.getByRole("heading", { level: 1, name: "Email verified" }),
  ).toBeVisible();
  // The token is gone from the address bar (TRD 6.3).
  expect(new URL(page.url()).hash).toBe("");

  await signInWithPassword(page, { email, password: PASSWORD });

  // The link works once.
  await page.context().clearCookies();
  await page.goto("about:blank");
  await page.goto(pathOf(link));
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "This link has expired or was already used",
    }),
  ).toBeVisible();
});

test("FE-4 signing up with a taken email looks the same and mails the owner", async ({
  page,
}) => {
  const email = uniqueEmail("taken");
  for (const attempt of [1, 2]) {
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill(`Attempt ${String(attempt)}`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/sign-up/check-email");
  }
  await nextMailLink(email, "verify_email");
  await expect
    .poll(() => mailLinks(email, "existing_account").length, {
      timeout: 30_000,
    })
    .toBeGreaterThan(0);
});
