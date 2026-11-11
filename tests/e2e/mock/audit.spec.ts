import { expect, expectNoA11yViolations, test } from "../fixtures";
import { signIn } from "../session";

// The audit log (FE-46; DESIGN_BRIEF 7.9). The mock identity serves a fixed
// log of 33 entries (tests/e2e/mock-admin.mts).

const AUDITOR = ["audit:read", "users:read"];
const DINA = "00000000-0000-4000-8000-00000000b001";

test.describe("audit log", () => {
  test.use({ timezoneId: "Asia/Jakarta" });

  test("FE-46 lists entries in words, opens from the sidebar, axe clean", async ({
    page,
    context,
  }) => {
    await signIn(context, { perms: AUDITOR });
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Audit log" })
      .click();
    await expect(page).toHaveURL("/admin/audit");
    const table = page.getByRole("table", { name: "Audit log" });
    await expect(table.getByText("Changed a role’s permissions")).toBeVisible();
    await expect(page.getByText("1–25 of 33")).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("FE-46 times show in the viewer's time zone with UTC on hover", async ({
    page,
    context,
  }) => {
    await signIn(context, { perms: AUDITOR });
    await page.goto("/admin/audit");
    const time = page
      .getByRole("table", { name: "Audit log" })
      .locator('time[datetime="2026-11-10T09:30:00Z"]');
    await expect(time).toHaveAttribute("title", "2026-11-10 09:30:00 UTC");
    // 09:30 UTC is 16:30 in Jakarta.
    await expect(time).toContainText("4:30");
  });

  test("FE-46 a row expands into the before/after view", async ({
    page,
    context,
  }) => {
    await signIn(context, { perms: AUDITOR });
    await page.goto("/admin/audit");
    const table = page.getByRole("table", { name: "Audit log" });
    await table
      .getByRole("button", {
        name: "Show the changes of Changed a role’s permissions",
      })
      .click();
    const diff = page.getByRole("table", { name: "Changes" });
    await expect(diff.getByText('["audit:read","users:read"]')).toBeVisible();
    await expect(
      diff.getByRole("rowheader", { name: /permissions/ }),
    ).toContainText("(changed)");
    await expectNoA11yViolations(page);
  });

  test("FE-46 filters by actor, action and dates in the URL, kept on reload", async ({
    page,
    context,
  }) => {
    await signIn(context, { perms: AUDITOR });
    await page.goto("/admin/audit");
    await page.getByRole("searchbox", { name: "By" }).fill("dina");
    await page
      .getByRole("list", { name: "Matching people" })
      .getByRole("button", { name: /Dina Pratama/ })
      .click();
    await expect(page).toHaveURL(`/admin/audit?actor=${DINA}`);
    const table = page.getByRole("table", { name: "Audit log" });
    await expect(table.getByRole("row")).toHaveCount(3);

    await page.getByRole("combobox", { name: "Action" }).click();
    await page.getByRole("option", { name: "Roles" }).click();
    await expect(table.getByRole("row")).toHaveCount(2);

    await page.getByLabel("From", { exact: true }).fill("2026-11-10");
    await page.getByLabel("To", { exact: true }).fill("2026-11-10");
    await expect(page).toHaveURL(
      `/admin/audit?actor=${DINA}&action=role.&from=2026-11-10&to=2026-11-10`,
    );
    await expect(table.getByText("Changed a role’s permissions")).toBeVisible();

    await page.reload();
    await expect(table.getByText("Changed a role’s permissions")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Action" })).toHaveText(
      "Roles",
    );
    await expect(page.getByText("Dina Pratama").first()).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByRole("button", { name: "Clear filters" }).first().click();
    await expect(page).toHaveURL("/admin/audit");
  });

  test("FE-46 Refresh reloads the log by hand", async ({ page, context }) => {
    await signIn(context, { perms: AUDITOR });
    await page.goto("/admin/audit");
    await expect(page.getByText(/^Updated /)).toBeVisible();
    const request = page.waitForRequest(/\/api\/id\/admin\/audit/);
    await page.getByRole("button", { name: "Refresh" }).click();
    await request;
  });

  test("a user without audit:read sees no link and gets 403", async ({
    page,
    context,
  }) => {
    await signIn(context, { perms: ["users:read"] });
    await page.goto("/");
    await expect(
      page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: "Audit log" }),
    ).toHaveCount(0);
    const response = await page.goto("/admin/audit");
    expect(response?.status()).toBe(403);
  });
});
