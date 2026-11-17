import { expect, test } from "../fixtures";

// The development-only component gallery (/dev/components). axe for this route
// runs with every other route in axe-routes.spec.ts.

test.describe("component gallery", () => {
  test("opens signed out, without the app shell, and lists every section", async ({
    page,
  }) => {
    await page.goto("/dev/components");
    await expect(page).toHaveURL("/dev/components");
    await expect(
      page.getByRole("heading", { level: 1, name: "Components" }),
    ).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
    const index = page.getByRole("navigation", { name: "Components" });
    for (const name of ["Colour", "Button", "Dialog", "Toast"]) {
      await expect(index.getByRole("link", { name })).toBeVisible();
    }
  });

  test("the theme switch changes the theme and keeps it on reload", async ({
    page,
  }) => {
    await page.goto("/dev/components");
    const html = page.locator("html");
    const themes = page.getByRole("group", { name: "Theme" });
    await themes.getByRole("button", { name: "Dark" }).click();
    await expect(html).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(
      themes.getByRole("button", { name: "Dark", pressed: true }),
    ).toBeVisible();
    await themes.getByRole("button", { name: "Light" }).click();
    await expect(html).toHaveAttribute("data-theme", "light");
  });

  test("a destructive confirm needs the name typed before it enables", async ({
    page,
  }) => {
    await page.goto("/dev/components#dialog");
    await page.getByRole("button", { name: "Delete…" }).click();
    const dialog = page.getByRole("dialog", { name: "Delete Acme Ltd?" });
    const confirm = dialog.getByRole("button", { name: "Delete tenant" });
    await expect(confirm).toBeDisabled();
    await dialog.getByRole("textbox").fill("Acme Ltd");
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(dialog).toBeHidden();
  });
});
