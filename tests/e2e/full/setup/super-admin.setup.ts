import { expect, test } from "../../fixtures";
import { SUPER_ADMIN, login, openAccountMenu } from "../support";

// Runs before the full suite (playwright.config.ts `full-setup`). Identity
// creates the super admin from its config with a temporary password that must
// be changed at the first sign-in: APP_FLOW 5.6 against the real identity.

test("FE-7 the super admin's first sign-in is confined to /change-password until the password changes", async ({
  page,
  context,
}) => {
  const alreadyChanged = await login(SUPER_ADMIN.email, SUPER_ADMIN.password)
    .then(() => true)
    .catch(() => false);
  test.skip(
    alreadyChanged,
    "The stack was reused: the password is already changed.",
  );

  await page.goto("/sign-in?next=%2Fadmin%2Fusers");
  await page.getByLabel("Email").fill(SUPER_ADMIN.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(SUPER_ADMIN.tempPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/change-password");
  await expect(
    page.getByRole("heading", { level: 1, name: "Choose a new password" }),
  ).toBeVisible();

  // Every other route sends the user back; the BFF refuses the proxy.
  await page.goto("/admin/users");
  await expect(page).toHaveURL("/change-password");
  const status = await page.evaluate(
    async () => (await fetch("/api/id/me")).status,
  );
  expect(status).toBe(403);

  await page.getByLabel("New password").fill(SUPER_ADMIN.password);
  await page.getByRole("button", { name: "Change password" }).click();
  // Back to where the user was going before the restriction.
  await expect(page).toHaveURL("/admin/users");
  await expect(
    page.getByRole("heading", { level: 1, name: "Users" }),
  ).toBeVisible();
  const names = (await context.cookies()).map((cookie) => cookie.name);
  expect(names).toEqual(
    expect.arrayContaining(["__Host-ws_at", "__Host-ws_rt"]),
  );
  expect(names).not.toContain("__Host-ws_pc");

  await openAccountMenu(page);
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/sign-in");
});
