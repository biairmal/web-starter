import { expect, test } from "../fixtures";

// The locale is chosen per request: the locale cookie, then Accept-Language,
// then NEXT_PUBLIC_DEFAULT_LOCALE (TRD 12). The page's <html lang> shows it.

test.describe("locale", () => {
  test("defaults to English", async ({ browser }) => {
    const context = await browser.newContext({ locale: "fr-FR" });
    const page = await context.newPage();
    await page.goto("/sign-in");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await context.close();
  });

  test("follows Accept-Language when there is no cookie", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "id-ID" });
    const page = await context.newPage();
    await page.goto("/sign-in");
    await expect(page.locator("html")).toHaveAttribute("lang", "id");
    await context.close();
  });

  test("prefers the locale cookie over Accept-Language", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "id-ID" });
    await context.addCookies([
      { name: "ws_locale", value: "en", url: "http://localhost:3000" },
    ]);
    const page = await context.newPage();
    await page.goto("/sign-in");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await context.close();
  });
});
