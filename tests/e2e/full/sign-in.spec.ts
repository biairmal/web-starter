import { expect, test } from "../fixtures";
import {
  type Account,
  createAccount,
  signInWithPassword,
  tenancy,
} from "./support";

// APP_FLOW 5.1: sign in with a password against the real identity (FE-1,
// FE-2, FE-10).

test.skip(tenancy !== "single", "single-mode journey");

let admin: Account;

test.beforeAll(async () => {
  admin = await createAccount("signin", ["admin"]);
});

test("FE-2 a signed-out visit goes to sign-in and back to next, with httpOnly cookies", async ({
  page,
  context,
}) => {
  await page.goto("/admin/users");
  await expect(page).toHaveURL("/sign-in?next=%2Fadmin%2Fusers");

  await page.getByLabel("Email").fill(admin.email);
  await page.getByLabel("Password", { exact: true }).fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Email or password is incorrect." }),
  ).toBeVisible();

  await page.getByLabel("Password", { exact: true }).fill(admin.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/admin/users");
  await expect(
    page.getByRole("heading", { level: 1, name: "Users" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Open account menu/ }),
  ).toContainText(admin.name);

  const cookies = await context.cookies();
  for (const name of ["__Host-ws_at", "__Host-ws_rt"]) {
    const cookie = cookies.find((entry) => entry.name === name);
    expect(cookie, name).toBeDefined();
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    // Encrypted (JWE compact: five parts), not identity's JWT (three).
    expect(cookie?.value.split(".")).toHaveLength(5);
  }
  expect(await page.evaluate(() => document.cookie)).not.toContain("__Host-");
});

test("a signed-in user visiting /sign-in goes to /", async ({ page }) => {
  await signInWithPassword(page, admin);
  await page.goto("/sign-in");
  await expect(page).toHaveURL("/");
});
