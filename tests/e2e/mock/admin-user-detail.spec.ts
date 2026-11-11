import { expect, expectNoA11yViolations, test } from "../fixtures";
import { signIn } from "../session";

// The user detail page and its actions (FE-42, FE-47; APP_FLOW 5.12). The
// mock identity keeps a tenant per session ID and enforces identity's rules
// (tests/e2e/mock-admin.mts).

const ADMIN = [
  "users:read",
  "users:manage",
  "roles:manage",
  "audit:read",
  "notes:read",
];
const DINA = "00000000-0000-4000-8000-00000000b001";
const CITRA = "00000000-0000-4000-8000-00000000b003";
const SARI = "00000000-0000-4000-8000-00000000b004";
const MEMBER = "00000000-0000-4000-8000-00000000c001";

function sid(n: number): string {
  return `00000000-0000-4000-8000-0000000052${String(n).padStart(2, "0")}`;
}

test.describe("admin user detail", () => {
  test("FE-44 a role granting a permission the admin lacks is disabled", async ({
    page,
    context,
  }) => {
    await signIn(context, {
      sid: sid(7),
      perms: ["users:read", "users:manage", "roles:manage", "notes:read"],
    });
    await page.goto(`/admin/users/${MEMBER}`);
    const roles = page.getByRole("region", { name: "Roles" });
    await roles.getByRole("button", { name: "Edit roles" }).click();
    await expect(roles.getByRole("checkbox", { name: "Admin" })).toBeDisabled();
    await expect(
      roles.getByText(
        "Grants a permission you don’t hold, so you can’t assign it.",
      ),
    ).toHaveCount(2);
    await expect(roles.getByRole("checkbox", { name: "Sales" })).toBeEnabled();
  });

  test("FE-42 opens from the list and is axe clean", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(1), perms: ADMIN });
    await page.goto("/admin/users?search=citra");
    await page
      .getByRole("table", { name: "Users" })
      .getByRole("link", { name: "Citra Lestari" })
      .click();
    await expect(page).toHaveURL(`/admin/users/${CITRA}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Citra Lestari" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Enable" })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("FE-42 changes roles, then revokes sessions from the toast", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(2), perms: ADMIN });
    await page.goto(`/admin/users/${MEMBER}`);
    const roles = page.getByRole("region", { name: "Roles" });
    await roles.getByRole("button", { name: "Edit roles" }).click();
    await roles.getByRole("checkbox", { name: "Manager" }).click();
    await expectNoA11yViolations(page);
    await roles.getByRole("button", { name: "Save roles" }).click();
    await expect(
      page.getByText(
        "Roles updated. Member 01 sees the change within 15 minutes.",
      ),
    ).toBeVisible();
    await expect(roles.getByText("Manager")).toBeVisible();
    await page.getByRole("button", { name: "Revoke sessions now" }).click();
    await expect(
      page.getByText("Member 01 was signed out everywhere."),
    ).toBeVisible();
  });

  test("FE-47 the admin's own account is read-only with the reason", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(3), sub: DINA, perms: ADMIN });
    await page.goto(`/admin/users/${DINA}`);
    await expect(
      page.getByText(
        "This is your account. Another admin has to change your roles.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit roles" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("button", { name: "Disable" })).toBeDisabled();
  });

  test("FE-42 LAST_ADMIN and SUPER_ADMIN_PROTECTED show in the confirmation", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(4), perms: ADMIN });
    await page.goto(`/admin/users/${DINA}`);
    await page.getByRole("button", { name: "Disable" }).click();
    let dialog = page.getByRole("dialog", { name: "Disable Dina Pratama?" });
    await dialog.getByRole("button", { name: "Disable" }).click();
    await expect(dialog.getByRole("alert")).toHaveText(
      "This tenant needs at least one admin.",
    );
    await expectNoA11yViolations(page);
    await dialog.getByRole("button", { name: "Cancel" }).click();

    await page.goto(`/admin/users/${SARI}`);
    await page.getByRole("button", { name: "Remove from workspace" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Remove from workspace" }).click();
    await expect(dialog.getByRole("alert")).toHaveText(
      "The super admin can’t be changed.",
    );
  });

  test("FE-42 disable then enable, and remove returns to the list", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(5), perms: ADMIN });
    await page.goto(`/admin/users/${MEMBER}`);
    await page.getByRole("button", { name: "Disable" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Disable" })
      .click();
    await expect(page.getByText("Member 01 was disabled.")).toBeVisible();
    await page.getByRole("button", { name: "Enable" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Enable" })
      .click();
    await expect(page.getByText("Member 01 was enabled.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Disable" })).toBeVisible();

    await page.getByRole("button", { name: "Remove from workspace" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Remove from workspace" })
      .click();
    await expect(page).toHaveURL("/admin/users");
    await expect(page.getByText("Member 01 was removed.")).toBeVisible();
    await expect(page.getByText("29 users")).toBeVisible();
  });

  test("a user without users:read gets 403", async ({ page, context }) => {
    await signIn(context, { sid: sid(6), perms: ["notes:read"] });
    const response = await page.goto(`/admin/users/${DINA}`);
    expect(response?.status()).toBe(403);
  });
});
