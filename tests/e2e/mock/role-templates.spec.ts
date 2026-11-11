import { expect, expectNoA11yViolations, test } from "../fixtures";
import { MOCK_TEMPLATE_IDS } from "../mock-platform.mts";
import { signIn } from "../session";

// The super admin's role templates (FE-52; DESIGN_BRIEF 7.10): the role
// editor on the templates. The mock stack runs in single mode, where these
// pages do not exist. The multi-mode tests run with
//   MOCK_TENANCY=multi pnpm e2e:mock tests/e2e/mock/role-templates.spec.ts
// (stop a dev server started without it first, and clear .next/cache, which
// keeps identity's config for 5 minutes).

const MULTI = process.env.MOCK_TENANCY === "multi";
const NOTICE =
  "Changes apply only to tenants created later. Existing tenants keep their current roles.";

/** A session of its own per test: the mock keeps templates per session. */
function sid(n: number): string {
  return `00000000-0000-4000-8000-0000000063${String(n).padStart(2, "0")}`;
}

test.describe("role templates in single mode", () => {
  test.skip(MULTI, "single mode only");

  test("FE-52 the pages are 404 even for the super admin", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(1), sa: true });
    expect((await page.goto("/admin/role-templates"))?.status()).toBe(404);
    expect(
      (
        await page.goto(`/admin/role-templates/${MOCK_TEMPLATE_IDS.member}`)
      )?.status(),
    ).toBe(404);
    await page.goto("/");
    await expect(
      page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: "Role templates" }),
    ).toHaveCount(0);
  });
});

test.describe("role templates in multi mode", () => {
  test.skip(!MULTI, "needs MOCK_TENANCY=multi");

  test("FE-52 a non-super-admin gets 403", async ({ page, context }) => {
    await signIn(context, { sid: sid(2), perms: ["roles:manage"] });
    expect((await page.goto("/admin/role-templates"))?.status()).toBe(403);
  });

  test("FE-52 lists the templates with the notice and edits one in the role editor", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(3), sa: true });
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Role templates" })
      .click();
    await expect(page).toHaveURL("/admin/role-templates");
    await expect(page.getByText(NOTICE)).toBeVisible();
    await expect(page.getByText("2 templates")).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByRole("link", { name: "member", exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "member" }),
    ).toBeVisible();
    await expect(page.getByText(NOTICE)).toBeVisible();
    await expectNoA11yViolations(page);
    await page.getByRole("checkbox", { name: "Read notes" }).check();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved")).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("checkbox", { name: "Read notes" }),
    ).toBeChecked();

    await page.goto(`/admin/role-templates/${MOCK_TEMPLATE_IDS.admin}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "admin" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Delete template" }),
    ).toHaveCount(0);
  });

  test("FE-52 creates a template, then deletes it", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(4), sa: true });
    await page.goto("/admin/role-templates");
    await page.getByRole("link", { name: "New template" }).click();
    await expect(page).toHaveURL("/admin/role-templates/new");
    await expect(
      page.getByRole("heading", { level: 1, name: "New role template" }),
    ).toBeVisible();
    await page.getByRole("textbox", { name: "Name" }).fill("member");
    await page.getByRole("button", { name: "Create template" }).click();
    await expect(
      page.getByText("A template with this name already exists."),
    ).toBeVisible();
    await page.getByRole("textbox", { name: "Name" }).fill("Support");
    await page.getByRole("checkbox", { name: "See users" }).check();
    await page.getByRole("button", { name: "Create template" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Support" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/role-templates\/[0-9a-f-]+$/);
    await expect(
      page.getByRole("checkbox", { name: "See users" }),
    ).toBeChecked();

    await page.getByRole("button", { name: "Delete template" }).click();
    const dialog = page.getByRole("dialog", {
      name: "Delete the “Support” template?",
    });
    await expectNoA11yViolations(page);
    await dialog.getByRole("button", { name: "Delete template" }).click();
    await expect(page).toHaveURL("/admin/role-templates");
    await expect(page.getByText("Template “Support” deleted.")).toBeVisible();
    await expect(page.getByText("2 templates")).toBeVisible();
  });
});
