import { expect, expectNoA11yViolations, test } from "../fixtures";
import { MOCK_PASSWORD } from "../mock-users";
import { signIn } from "../session";

// The account page: profile and password (FE-32, DESIGN_BRIEF 7.6). Each test
// has its own session ID, because the mock identity keeps a saved display
// name per session.

test.describe("account", () => {
  test("FE-32 renders the profile and password sections", async ({
    page,
    context,
  }) => {
    await signIn(context, {
      name: "Dina Pratama",
      sid: "00000000-0000-4000-8000-0000000000b1",
    });
    await page.goto("/account");
    await expect(
      page.getByRole("heading", { level: 1, name: "Account" }),
    ).toBeVisible();
    await expect(page.getByLabel("Display name")).toHaveValue("Dina Pratama");
    await expect(page.getByText("Verified")).toBeVisible();
    await expect(page.getByLabel("Current password")).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("FE-32 a new display name shows in the user menu without a reload", async ({
    page,
    context,
  }) => {
    await signIn(context, {
      name: "Dina Pratama",
      sid: "00000000-0000-4000-8000-0000000000b2",
    });
    await page.goto("/account");
    await page.waitForLoadState("networkidle");
    // A full reload would clear this marker.
    await page.evaluate(() => {
      (window as unknown as { __noReload?: boolean }).__noReload = true;
    });

    await page.getByLabel("Display name").fill("Dina P.");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Open account menu/ }),
    ).toContainText("Dina P.");
    expect(
      await page.evaluate(
        () => (window as unknown as { __noReload?: boolean }).__noReload,
      ),
    ).toBe(true);
  });

  test("FE-32 a password change keeps this device signed in", async ({
    page,
    context,
  }) => {
    await signIn(context, {
      sid: "00000000-0000-4000-8000-0000000000b3",
    });
    await page.goto("/account");
    await page.waitForLoadState("networkidle");
    const before = (await context.cookies()).find(
      (cookie) => cookie.name === "__Host-ws_rt",
    )?.value;

    await page.getByLabel("Current password").fill("not-my-password");
    await page.getByLabel("New password").fill("granite-harbor-root");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(
      page.getByText("That isn’t your current password."),
    ).toBeVisible();
    expect(new URL(page.url()).search).toBe("");

    await page.getByLabel("Current password").fill(MOCK_PASSWORD);
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("Password changed")).toBeVisible();
    await expect(
      page.getByText("Other devices were signed out."),
    ).toBeVisible();
    await expect(page).toHaveURL("/account");

    // The new session replaced this browser's cookies.
    const after = (await context.cookies()).find(
      (cookie) => cookie.name === "__Host-ws_rt",
    )?.value;
    expect(after).toBeDefined();
    expect(after).not.toBe(before);
    await page.reload();
    await expect(page).toHaveURL("/account");
  });

  test("FE-32 a Google-only account sets a password without the current one", async ({
    page,
    context,
  }) => {
    await signIn(context, {
      sid: "00000000-0000-4000-8000-0000000000b4",
      providers: { password: false, google: true },
    });
    await page.goto("/account");
    await expect(
      page.getByRole("heading", { level: 2, name: "Set a password" }),
    ).toBeVisible();
    await expect(page.getByLabel("Current password")).toHaveCount(0);
  });
});
