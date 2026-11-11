import { expect, expectNoA11yViolations, test } from "../fixtures";
import { signIn } from "../session";

// The super admin's tenant screens (FE-50, FE-51; APP_FLOW 5.15). The mock
// stack runs in single mode, where these pages do not exist. The multi-mode
// tests run with the mock identity in multi mode:
//   MOCK_TENANCY=multi pnpm e2e:mock tests/e2e/mock/tenants.spec.ts
// (stop a dev server started without it first, and clear .next/cache, which
// keeps identity's config for 5 minutes).

const MULTI = process.env.MOCK_TENANCY === "multi";
const ACME_ID = "00000000-0000-4000-8000-0000000000a1";

/** A session of its own per test: the mock keeps tenants per session. */
function sid(n: number): string {
  return `00000000-0000-4000-8000-0000000062${String(n).padStart(2, "0")}`;
}

test.describe("tenants in single mode", () => {
  test.skip(MULTI, "single mode only");

  test("FE-50 the pages are 404 even for the super admin, and not in the nav", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(1), sa: true });
    const response = await page.goto("/admin/tenants");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "We couldn’t find that page",
      }),
    ).toBeVisible();
    expect((await page.goto(`/admin/tenants/${ACME_ID}`))?.status()).toBe(404);

    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Users" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Tenants" })).toHaveCount(0);
    await expect(nav.getByRole("heading", { name: "Platform" })).toHaveCount(0);
  });
});

test.describe("tenants in multi mode", () => {
  test.skip(!MULTI, "needs MOCK_TENANCY=multi");

  test("FE-50 a non-super-admin gets 403 and no Platform entry", async ({
    page,
    context,
  }) => {
    await signIn(context, {
      sid: sid(2),
      perms: ["users:read", "roles:manage"],
    });
    const response = await page.goto("/admin/tenants");
    expect(response?.status()).toBe(403);
    await expect(
      page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: "Tenants" }),
    ).toHaveCount(0);
  });

  test("FE-50 lists tenants, filters by status in the URL, and creates one", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(3), sa: true });
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Tenants" })
      .click();
    await expect(page).toHaveURL("/admin/tenants");
    await expect(
      page.getByRole("heading", { level: 1, name: "Tenants" }),
    ).toBeVisible();
    await expect(page.getByText("3 tenants")).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByRole("button", { name: "Suspended" }).click();
    await expect(page).toHaveURL("/admin/tenants?status=suspended");
    await expect(page.getByText("1 tenant", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("link", { name: "Globex" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Acme", exact: true }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Create tenant" }).click();
    const dialog = page.getByRole("dialog", { name: "Create tenant" });
    await dialog.getByLabel(/^Name/).fill("Sinar Jaya");
    await expect(dialog.getByLabel(/^Slug/)).toHaveValue("sinar-jaya");
    await dialog.getByLabel(/^Slug/).fill("Sinar_Jaya");
    await expect(
      dialog.getByText(/Use 2 or more lowercase letters/),
    ).toBeVisible();
    await expectNoA11yViolations(page);
    await dialog.getByLabel(/^Slug/).fill("acme");
    await dialog.getByLabel(/First admin/).fill("owner@sinar.test");
    await dialog.getByRole("button", { name: "Create tenant" }).click();
    await expect(
      dialog.getByText("Another tenant already uses this slug."),
    ).toBeVisible();
    await dialog.getByLabel(/^Slug/).fill("sinar-jaya");
    await dialog.getByRole("button", { name: "Create tenant" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Sinar Jaya" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/tenants\/[0-9a-f-]+$/);
    await expect(
      page.getByText("Tenant created. Invite sent to owner@sinar.test."),
    ).toBeVisible();
  });

  test("FE-51 suspends and reactivates a tenant; the default tenant has no Suspend", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: sid(4), sa: true });
    await page.goto(`/admin/tenants/${ACME_ID}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Acme" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open as admin" }),
    ).toBeEnabled();
    await expectNoA11yViolations(page);

    await page.getByRole("button", { name: "Suspend tenant" }).click();
    const dialog = page.getByRole("dialog", { name: "Suspend Acme?" });
    await expect(dialog.getByText(/12 users can’t sign in/)).toBeVisible();
    await expectNoA11yViolations(page);
    await dialog.getByLabel(/Type Acme/).fill("Acme");
    await dialog.getByRole("button", { name: "Suspend tenant" }).click();
    await expect(page.getByText("Acme is suspended.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open as admin" }),
    ).toBeDisabled();

    await page.getByRole("button", { name: "Reactivate tenant" }).click();
    await page
      .getByRole("dialog", { name: "Reactivate Acme?" })
      .getByRole("button", { name: "Reactivate tenant" })
      .click();
    await expect(page.getByText("Acme is active again.")).toBeVisible();

    await page.goto("/admin/tenants/00000000-0000-4000-8000-000000000002");
    await expect(
      page.getByText("This is the default tenant. It can’t be suspended."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Suspend tenant" }),
    ).toHaveCount(0);
  });
});
