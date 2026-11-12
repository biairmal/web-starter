import { expect, test } from "../fixtures";
import {
  createAccount,
  login,
  openAccountMenu,
  signInWithPassword,
  tenancy,
} from "./support";

// APP_FLOW 5.9: sign out, other tabs follow, sign out everywhere (FE-22).

test.skip(tenancy !== "single", "single-mode journey");

test("FE-22 sign out clears the session, and another tab follows on its next action", async ({
  page,
  context,
}) => {
  const account = await createAccount("signout", ["member"]);
  await signInWithPassword(page, account);
  const other = await context.newPage();
  await other.goto("/account");
  await expect(other).toHaveURL("/account");

  await openAccountMenu(page);
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/sign-in");
  const names = (await context.cookies()).map((cookie) => cookie.name);
  expect(names).not.toContain("__Host-ws_at");
  expect(names).not.toContain("__Host-ws_rt");

  await other.getByRole("heading", { level: 1 }).click();
  await expect(other).toHaveURL("/sign-in?next=%2Faccount");
});

test("FE-22 sign out everywhere ends the sessions on other devices", async ({
  page,
  browser,
}) => {
  const account = await createAccount("everywhere", ["member"]);
  const laptop = await browser.newContext();
  const laptopPage = await laptop.newPage();
  await signInWithPassword(laptopPage, account);
  await signInWithPassword(page, account, "/account/security");

  const sessions = page.getByRole("region", { name: "Sessions" });
  // This browser, the laptop, and the session the invite acceptance opened.
  await expect(sessions.getByRole("listitem")).toHaveCount(3);
  await page.getByRole("button", { name: "Sign out everywhere" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Sign out everywhere" })
    .click();
  await expect(page).toHaveURL("/sign-in");

  await expect(async () => {
    await laptopPage.goto("/account");
    await expect(laptopPage).toHaveURL(/\/sign-in/);
  }).toPass({ timeout: 90_000, intervals: [5_000] });
  await laptop.close();

  // The password still works; only the sessions ended.
  await login(account.email, account.password);
});
