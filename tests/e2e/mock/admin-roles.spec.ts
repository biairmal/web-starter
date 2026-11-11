import type { Page } from "@playwright/test";
import { expect, expectNoA11yViolations, test } from "../fixtures";
import { signIn } from "../session";

// The roles list, create and delete (FE-43; APP_FLOW 5.14). The mock identity
// keeps a tenant per session ID (tests/e2e/mock-admin.mts).

const ADMIN = ["users:read", "roles:manage"];

function sid(n: number): string {
  return `00000000-0000-4000-8000-0000000053${String(n).padStart(2, "0")}`;
}

function row(page: Page, name: string) {
  return page
    .getByRole("table", { name: "Roles" })
    .getByRole("row")
    .filter({ has: page.getByRole("link", { name, exact: true }) });
}

test.describe("admin roles", () => {
  test("FE-43 lists roles with counts, from the sidebar, axe clean", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(1), perms: ADMIN });
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Roles" })
      .click();
    await expect(page).toHaveURL("/admin/roles");
    await expect(
      page.getByRole("heading", { level: 1, name: "Roles" }),
    ).toBeVisible();
    const admin = row(page, "Admin");
    await expect(admin.getByText("System")).toBeVisible();
    await expect(admin.getByRole("cell").nth(2)).toHaveText("1");
    await expect(admin.getByRole("cell").nth(3)).toHaveText("4");
    await expect(row(page, "Sales").getByRole("cell").nth(2)).toHaveText("28");
    await expectNoA11yViolations(page);
  });

  test("FE-43 creates a role; a used name shows DUPLICATE", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(2), perms: ADMIN });
    await page.goto("/admin/roles");
    await page.getByRole("button", { name: "Create role" }).click();
    const dialog = page.getByRole("dialog", { name: "Create a role" });
    await dialog.getByRole("textbox", { name: /Name/ }).fill("sales");
    await dialog.getByRole("button", { name: "Create role" }).click();
    await expect(
      dialog.getByText("A role with this name already exists."),
    ).toBeVisible();
    await expectNoA11yViolations(page);

    await dialog.getByRole("textbox", { name: /Name/ }).fill("Support");
    await dialog.getByRole("button", { name: "Create role" }).click();
    await expect(
      page.getByText("Role “Support” created. Choose what it can do."),
    ).toBeVisible();
    // The new role has no permissions yet, so its editor opens.
    await expect(
      page.getByRole("heading", { level: 1, name: "Support" }),
    ).toBeVisible();
    await page.goto("/admin/roles");
    await expect(row(page, "Support")).toHaveCount(1);
  });

  test("FE-43 an assigned role deletes only with force and the typed name", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(3), perms: ADMIN });
    await page.goto("/admin/roles");
    await row(page, "Manager")
      .getByRole("button", { name: "Actions for Manager" })
      .click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Delete role" }).click();
    await expect(
      dialog.getByText(
        "2 users have this role. They lose everything it grants.",
      ),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Delete anyway" }),
    ).toBeDisabled();
    await expectNoA11yViolations(page);
    await dialog.getByRole("textbox").fill("Manager");
    await dialog.getByRole("button", { name: "Delete anyway" }).click();
    await expect(page.getByText("Role “Manager” deleted.")).toBeVisible();
    await expect(row(page, "Manager")).toHaveCount(0);
  });

  test("FE-43 a system role cannot be deleted from the menu", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(4), perms: ADMIN });
    await page.goto("/admin/roles");
    await row(page, "Admin")
      .getByRole("button", { name: "Actions for Admin" })
      .click();
    await expect(page.getByRole("menuitem", { name: "View" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Delete" })).toHaveCount(0);
  });

  test("a user without roles:manage sees no Roles link and gets 403", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(5), perms: ["users:read"] });
    await page.goto("/");
    await expect(
      page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: "Roles" }),
    ).toHaveCount(0);
    const response = await page.goto("/admin/roles");
    expect(response?.status()).toBe(403);
  });
});
