import { expect, expectNoA11yViolations, test } from "../fixtures";
import { signIn } from "../session";

// The users list and the invite dialog (FE-40, FE-41; APP_FLOW 5.11, 7). The
// mock identity keeps a small tenant per session ID (tests/e2e/mock-admin.mts),
// so each test signs in with its own.

const ADMIN = ["users:read", "users:manage", "roles:manage"];
const SALES_ROLE = "00000000-0000-4000-8000-00000000a003";

function sid(n: number): string {
  return `00000000-0000-4000-8000-0000000051${String(n).padStart(2, "0")}`;
}

test.describe("admin users", () => {
  test("FE-40 lists users, pages, and is axe clean", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(1), perms: ADMIN });
    await page.goto("/admin/users");
    await expect(
      page.getByRole("heading", { level: 1, name: "Users" }),
    ).toBeVisible();
    const table = page.getByRole("table", { name: "Users" });
    await expect(
      table.getByRole("link", { name: "Dina Pratama" }),
    ).toBeVisible();
    await expect(page.getByText("30 users")).toBeVisible();
    await expect(page.getByText("1–25 of 30")).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page).toHaveURL("/admin/users?page=2");
    await expect(page.getByText("26–30 of 30")).toBeVisible();
  });

  test("FE-40 filters and sort live in the URL and survive a reload", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(2), perms: ADMIN });
    await page.goto("/admin/users");
    const table = page.getByRole("table", { name: "Users" });
    await expect(
      table.getByRole("link", { name: "Dina Pratama" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Invited" }).click();
    await expect(page).toHaveURL("/admin/users?membership_status=invited");
    await expect(table.getByRole("row")).toHaveCount(2);
    await expect(
      table.getByRole("link", { name: "Budi Santoso" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "All" }).click();
    await page.getByRole("combobox", { name: "Role" }).click();
    await page.getByRole("option", { name: "Sales" }).click();
    await expect(page).toHaveURL(`/admin/users?role=${SALES_ROLE}`);

    await page.getByRole("combobox", { name: "Account status" }).click();
    await page.getByRole("option", { name: "Account active" }).click();
    await page.getByRole("button", { name: "Name" }).click();
    await page
      .getByRole("searchbox", { name: "Search by name or exact email" })
      .fill("citra");
    await expect(page).toHaveURL(
      `/admin/users?sort=display_name%2CASC&search=citra&status=active&role=${SALES_ROLE}`,
    );
    await expect(
      table.getByRole("link", { name: "Citra Lestari" }),
    ).toBeVisible();

    await page.reload();
    await expect(
      table.getByRole("link", { name: "Citra Lestari" }),
    ).toBeVisible();
    await expect(
      page.getByRole("searchbox", { name: "Search by name or exact email" }),
    ).toHaveValue("citra");
    await expect(
      page.getByRole("combobox", { name: "Account status" }),
    ).toHaveText("Account active");
    await expect(page.getByRole("combobox", { name: "Role" })).toHaveText(
      "Sales",
    );
    await expect(
      page.getByRole("columnheader", { name: "Name" }),
    ).toHaveAttribute("aria-sort", "ascending");
  });

  test("FE-40 search by exact email; no match offers Clear filters", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(3), perms: ADMIN });
    await page.goto("/admin/users?search=budi%40example.test");
    await expect(
      page
        .getByRole("table", { name: "Users" })
        .getByRole("link", { name: "Budi Santoso" }),
    ).toBeVisible();

    await page.goto("/admin/users?search=nobody");
    await expect(page.getByText("No users match these filters")).toBeVisible();
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Clear filters" }).last().click();
    await expect(page).toHaveURL("/admin/users");
  });

  test("FE-41 invites a user with a role, then finds them in Invited", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(4), perms: ADMIN });
    await page.goto("/admin/users");
    await page.getByRole("button", { name: "Invite user" }).click();
    const dialog = page.getByRole("dialog", { name: "Invite a user" });
    await dialog
      .getByRole("textbox", { name: /Email/ })
      .fill("eka@example.test");
    await dialog.getByRole("textbox", { name: /Name/ }).fill("Eka Putri");
    await dialog.getByRole("button", { name: "Send invitation" }).click();
    await expect(dialog.getByText("Choose at least one role.")).toBeVisible();
    await expectNoA11yViolations(page);

    await dialog.getByRole("checkbox", { name: "Sales" }).click();
    await dialog.getByRole("button", { name: "Send invitation" }).click();
    await expect(
      page.getByText("Invite sent to eka@example.test"),
    ).toBeVisible();
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: "Invited" }).click();
    await expect(
      page
        .getByRole("table", { name: "Users" })
        .getByRole("link", { name: "Eka Putri" }),
    ).toBeVisible();
  });

  test("FE-41 an existing member shows on the email field", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(5), perms: ADMIN });
    await page.goto("/admin/users");
    await page.getByRole("button", { name: "Invite user" }).click();
    const dialog = page.getByRole("dialog", { name: "Invite a user" });
    await dialog
      .getByRole("textbox", { name: /Email/ })
      .fill("dina@example.test");
    await dialog.getByRole("checkbox", { name: "Admin" }).click();
    await dialog.getByRole("button", { name: "Send invitation" }).click();
    await expect(
      dialog.getByText("This person is already a member."),
    ).toBeVisible();
  });

  test("the invite button needs users:manage, the role filter roles:manage", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(6), perms: ["users:read"] });
    await page.goto("/admin/users");
    await expect(
      page
        .getByRole("table", { name: "Users" })
        .getByRole("link", { name: "Dina Pratama" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Invite user" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("combobox", { name: "Role" })).toHaveCount(0);
    await expect(
      page.getByRole("combobox", { name: "Account status" }),
    ).toBeVisible();
  });
});

test.describe("admin users at 375px", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("FE-40 rows become cards with every field", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(7), perms: ADMIN });
    await page.goto("/admin/users?search=citra");
    const cards = page.getByRole("list", { name: "Users" });
    await expect(cards.getByRole("listitem")).toHaveCount(1);
    const card = cards.getByRole("listitem").first();
    await expect(
      card.getByRole("link", { name: "Citra Lestari" }),
    ).toBeVisible();
    await expect(card.getByText("Disabled")).toBeVisible();
    await expect(card.getByText("citra@example.test")).toBeVisible();
    await expect(card.getByText("Manager, Sales")).toBeVisible();
    await expectNoA11yViolations(page);
  });
});
