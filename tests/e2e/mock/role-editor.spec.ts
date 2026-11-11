import { expect, expectNoA11yViolations, test } from "../fixtures";
import { signIn } from "../session";

// The role editor and its permission matrix (FE-44, FE-45, FE-47;
// APP_FLOW 5.13). The mock identity keeps a tenant per session ID, raises a
// role's version on each save and checks If-Match (tests/e2e/mock-admin.mts).

/** Holds every catalog key but notes:read:any. */
const ADMIN = [
  "users:read",
  "users:manage",
  "roles:manage",
  "audit:read",
  "notes:read",
  "notes:write",
];
const ADMIN_ROLE = "00000000-0000-4000-8000-00000000a001";
const MANAGER_ROLE = "00000000-0000-4000-8000-00000000a002";
const SALES_ROLE = "00000000-0000-4000-8000-00000000a003";

function sid(n: number): string {
  return `00000000-0000-4000-8000-0000000054${String(n).padStart(2, "0")}`;
}

test.describe("role editor", () => {
  test("FE-44 opens from the roles list; the matrix is grouped and axe clean", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(1), perms: ADMIN });
    await page.goto("/admin/roles");
    await page
      .getByRole("table", { name: "Roles" })
      .getByRole("link", { name: "Sales", exact: true })
      .click();
    await expect(page).toHaveURL(`/admin/roles/${SALES_ROLE}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Sales" }),
    ).toBeVisible();
    const notes = page.getByRole("group", { name: "notes" });
    await expect(notes.getByText("1 of 3 selected")).toBeVisible();
    await expect(
      notes.getByRole("checkbox", { name: "Read anyone's notes" }),
    ).toBeDisabled();
    await expect(
      page.getByText("You can’t grant a permission you don’t hold."),
    ).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("FE-44 ticks with the keyboard, saves, and the counts follow", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(2), perms: ADMIN });
    await page.goto(`/admin/roles/${SALES_ROLE}`);
    const write = page.getByRole("checkbox", { name: "Write notes" });
    await write.focus();
    await page.keyboard.press("Space");
    await expect(write).toBeChecked();
    await page.getByRole("textbox", { name: "Description" }).fill("Sells");
    await expect(page.getByText("1 permission added, 0 removed")).toBeVisible();
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);

    await page.reload();
    await expect(
      page.getByRole("checkbox", { name: "Write notes" }),
    ).toBeChecked();
    await expect(
      page.getByRole("textbox", { name: "Description" }),
    ).toHaveValue("Sells");
    await page.goto("/admin/roles");
    await expect(
      page
        .getByRole("table", { name: "Roles" })
        .getByRole("row")
        .filter({ has: page.getByRole("link", { name: "Sales", exact: true }) })
        .getByRole("cell")
        .nth(3),
    ).toHaveText("2");
  });

  test("FE-45 a conflicting save keeps the edits; Reload shows the other version", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(3), perms: ADMIN });
    await page.goto(`/admin/roles/${MANAGER_ROLE}`);
    await page.getByRole("checkbox", { name: "Write notes" }).click();

    // Someone else renames the role meanwhile.
    const other = await page.request.patch(
      `/api/id/admin/roles/${MANAGER_ROLE}`,
      {
        headers: {
          Origin: "http://localhost:3000",
          "X-Requested-With": "web-starter",
          "If-Match": '"3"',
        },
        data: { name: "Managers" },
      },
    );
    expect(other.status()).toBe(200);

    await page.getByRole("button", { name: "Save" }).click();
    const banner = page.getByRole("alert").filter({
      hasText: "Someone else changed this. Reload to see their version.",
    });
    await expect(banner).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "Write notes" }),
    ).toBeChecked();
    await expectNoA11yViolations(page);

    await banner.getByRole("button", { name: "Reload" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Managers" }),
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "Write notes" }),
    ).not.toBeChecked();
    await expect(banner).toHaveCount(0);
  });

  test("FE-47 a system role is read-only with the reason", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(4), perms: ADMIN });
    await page.goto(`/admin/roles/${ADMIN_ROLE}`);
    await expect(
      page.getByText(/System role, managed by .+\. It can’t be edited\./),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Name" })).toHaveCount(0);
    await expect(
      page.getByRole("checkbox", { name: "See users" }),
    ).toBeDisabled();
    await expect(page.getByRole("button", { name: "Delete role" })).toHaveCount(
      0,
    );
    await expectNoA11yViolations(page);
  });

  test("creates a role with its permissions on the new-role screen", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(5), perms: ADMIN });
    await page.goto("/admin/roles/new");
    await expect(
      page.getByRole("heading", { level: 1, name: "New role" }),
    ).toBeVisible();
    await page.getByRole("textbox", { name: "Name" }).fill("Support");
    await page.getByRole("checkbox", { name: "All users permissions" }).click();
    await page.getByRole("button", { name: "Create role" }).click();
    await expect(page).toHaveURL(
      /\/admin\/roles\/0{8}-0000-4000-8000-0000000e/,
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Support" }),
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "See users" }),
    ).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "Invite and change users" }),
    ).toBeChecked();
  });

  test("asks before leaving with unsaved changes", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(6), perms: ADMIN });
    await page.goto(`/admin/roles/${SALES_ROLE}`);
    await page.getByRole("checkbox", { name: "Write notes" }).click();
    page.once("dialog", (dialog) => {
      expect(dialog.message()).toBe(
        "Leave this page? Your changes to this role aren’t saved.",
      );
      void dialog.dismiss();
    });
    await page
      .getByRole("navigation", { name: "Breadcrumb" })
      .getByRole("link", { name: "Roles" })
      .click();
    await expect(page).toHaveURL(`/admin/roles/${SALES_ROLE}`);
  });
});
