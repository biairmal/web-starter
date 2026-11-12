import type { Page } from "@playwright/test";
import { expect, expectNoA11yViolations, test } from "../fixtures";
import { signIn } from "../session";
import { brand } from "@/config/brand";

// Error pages (DESIGN_BRIEF 7.11): each shows the brand and a way back.

/**
 * Waits until React has hydrated the shell: the server HTML is visible earlier,
 * but the tab only listens for other tabs once hydrated. Opening the user menu
 * works only then.
 */
async function waitForHydration(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Open account menu/ }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toBeHidden();
}

test.describe("error pages", () => {
  test("404 for an unknown path, with the brand and a way home", async ({
    page,
    context,
  }) => {
    await signIn(context);
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "We couldn’t find that page",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: brand.appName }).first(),
    ).toBeVisible();
    await page.getByRole("link", { name: "Go to home" }).click();
    await expect(page).toHaveURL("/");
    await expectNoA11yViolations(page);
  });

  test("/forbidden answers 403 with the brand and a way home", async ({
    page,
  }) => {
    const response = await page.goto("/forbidden");
    expect(response?.status()).toBe(403);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "You don’t have permission to view this",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: brand.appName }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Go to home" }),
    ).toHaveAttribute("href", "/");
    await expect(
      page.getByRole("link", { name: new RegExp(brand.supportEmail) }),
    ).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("a server failure shows the error page with try again and a way home", async ({
    page,
    context,
  }) => {
    await signIn(context, { fail: true });
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Something went wrong on our side",
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to home" })).toBeVisible();
    await expect(
      page.getByRole("img", { name: brand.appName }).first(),
    ).toBeVisible();
  });
});

test.describe("session end across tabs", () => {
  test("FE-21 signing out in tab A sends tab B to sign-in on its next action", async ({
    context,
  }) => {
    await signIn(context);
    const tabA = await context.newPage();
    const tabB = await context.newPage();
    await tabA.goto("/");
    await tabB.goto("/");
    await waitForHydration(tabB);

    // What sign-out does in tab A: the cookies go, and the other tabs are told.
    await context.clearCookies();
    await tabA.evaluate(() => {
      const channel = new BroadcastChannel("session");
      channel.postMessage({ type: "signed-out" });
      channel.close();
    });

    // Tab B waits for the user.
    await tabB.waitForTimeout(500);
    expect(new URL(tabB.url()).pathname).toBe("/");

    await tabB.bringToFront();
    await tabB.getByRole("heading", { level: 1 }).click();
    await expect(tabB).toHaveURL("/sign-in?next=%2F");
  });

  test("an ended session in tab A shows its reason in tab B", async ({
    context,
  }) => {
    await signIn(context);
    const tabA = await context.newPage();
    const tabB = await context.newPage();
    await tabA.goto("/");
    await tabB.goto("/");
    await waitForHydration(tabB);

    await context.clearCookies();
    await tabA.evaluate(() => {
      const channel = new BroadcastChannel("session");
      channel.postMessage({ type: "ended", reason: "REFRESH_REUSED" });
      channel.close();
    });
    await tabB.bringToFront();
    await tabB.keyboard.press("Tab");
    await expect(tabB).toHaveURL("/sign-in?reason=REFRESH_REUSED&next=%2F");
  });

  test("a tab whose session is still there stays signed in", async ({
    context,
  }) => {
    await signIn(context);
    const tabA = await context.newPage();
    const tabB = await context.newPage();
    await tabA.goto("/");
    await tabB.goto("/");
    await waitForHydration(tabB);

    // A message with the cookies still in place: B checks and reloads.
    await tabA.evaluate(() => {
      const channel = new BroadcastChannel("session");
      channel.postMessage({ type: "signed-out" });
      channel.close();
    });
    await tabB.bringToFront();
    await Promise.all([
      tabB.waitForEvent("load"),
      tabB.getByRole("heading", { level: 1 }).click(),
    ]);
    await expect(tabB).toHaveURL("/");
    await waitForHydration(tabB);
  });
});
