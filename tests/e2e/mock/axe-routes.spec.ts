import { expect, expectNoA11yViolations, test } from "../fixtures";
import { signIn } from "../session";

// Release pass (plan F7.4; TRD 12, FE-NFR-2): axe on every route in TRD 6.1,
// in both themes, with no critical or serious violation. Each screen's own
// spec checks its states; this one makes sure no route is left out.

const USER = "00000000-0000-4000-8000-00000000b001";
const ROLE = "00000000-0000-4000-8000-00000000a003";
const TENANT = "00000000-0000-4000-8000-0000000000a1";
const multi = process.env.MOCK_TENANCY === "multi";

const PUBLIC_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/sign-up/check-email",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/invite",
  "/forbidden",
];

const APP_ROUTES = [
  "/",
  "/account",
  "/account/security",
  "/admin/users",
  `/admin/users/${USER}`,
  "/admin/roles",
  "/admin/roles/new",
  `/admin/roles/${ROLE}`,
  "/admin/audit",
  "/notes",
  ...(multi
    ? ["/admin/tenants", `/admin/tenants/${TENANT}`, "/admin/role-templates"]
    : []),
];

const ALL_PERMISSIONS = [
  "users:read",
  "users:manage",
  "roles:manage",
  "audit:read",
  "notes:read",
  "notes:write",
];

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`every route, ${colorScheme} theme`, () => {
    test.use({ colorScheme });

    for (const route of PUBLIC_ROUTES) {
      test(`FE-NFR-2 ${route} has no critical or serious axe violation`, async ({
        page,
      }) => {
        await page.goto(route);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await page.waitForLoadState("networkidle");
        await expectNoA11yViolations(page);
      });
    }

    APP_ROUTES.forEach((route, index) => {
      test(`FE-NFR-2 ${route} has no critical or serious axe violation`, async ({
        page,
        context,
      }) => {
        const n = (colorScheme === "light" ? 0 : 50) + index;
        await signIn(context, {
          sid: `00000000-0000-4000-8000-0000000055${String(n).padStart(2, "0")}`,
          sa: true,
          perms: ALL_PERMISSIONS,
          name: "Axe Reviewer",
        });
        await page.goto(route);
        await expect(page).toHaveURL(route);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await page.waitForLoadState("networkidle");
        await expectNoA11yViolations(page);
      });
    });
  });
}
