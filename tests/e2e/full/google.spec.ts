import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures";
import {
  FAKE_GOOGLE,
  createAccount,
  signInWithPassword,
  tenancy,
  uniqueEmail,
  uniqueName,
} from "./support";

// APP_FLOW 5.3 (continue with Google) and 5.16 (link and unlink), through
// identity's real Google flow against the fake OIDC provider in the stack
// (deploy/e2e/fake-oidc.mjs) (FE-3, FE-33).

test.skip(tenancy !== "single", "single-mode journey");

/** Plays the Google account on the fake provider's consent form. */
async function chooseGoogleAccount(page: Page, email: string, name: string) {
  await expect(page).toHaveURL(new RegExp(`^${FAKE_GOOGLE}/authorize`));
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
}

test("FE-3 a new Google user signs in and lands on next; Google is then their only way in", async ({
  page,
}) => {
  const email = uniqueEmail("google");
  const name = uniqueName("Gita");
  await page.goto("/sign-in?next=%2Faccount%2Fsecurity");
  await page.getByRole("link", { name: "Continue with Google" }).click();
  await chooseGoogleAccount(page, email, name);
  await expect(page).toHaveURL("/account/security");
  await expect(
    page.getByRole("button", { name: /Open account menu/ }),
  ).toContainText(name);

  // FE-33: the last way to sign in cannot be unlinked.
  await expect(page.getByRole("button", { name: "Unlink" })).toBeDisabled();
  await expect(
    page.getByText("Keep at least one way to sign in.").last(),
  ).toBeVisible();
});

test("FE-33 a password user links Google, signs in with it, and unlinks it", async ({
  page,
  browser,
}) => {
  const account = await createAccount("linker", ["member"]);
  await signInWithPassword(page, account, "/account/security");
  await page.getByRole("link", { name: "Link Google" }).click();
  await chooseGoogleAccount(page, account.email, account.name);
  await expect(page).toHaveURL("/account/security");
  await expect(page.getByText("Google linked")).toBeVisible();

  // The linked Google account now signs in to the same user.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto("/sign-in");
  await otherPage.getByRole("link", { name: "Continue with Google" }).click();
  await chooseGoogleAccount(otherPage, account.email, account.name);
  await expect(otherPage).toHaveURL("/");
  await expect(
    otherPage.getByRole("button", { name: /Open account menu/ }),
  ).toContainText(account.name);
  await other.close();

  await page.getByRole("button", { name: "Unlink" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Unlink" })
    .click();
  await expect(page.getByText("Google unlinked")).toBeVisible();
  await expect(page.getByRole("link", { name: "Link Google" })).toBeVisible();
});
