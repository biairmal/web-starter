import { expect, test } from "../fixtures";
import { signIn } from "../session";

// The development-only component gallery (/dev/components). axe for this route
// runs with every other route in axe-routes.spec.ts.

test.describe("component gallery", () => {
  test("lists every section and is not in the main nav", async ({
    page,
    context,
  }) => {
    await signIn(context, { perms: [] });
    await page.goto("/dev/components");
    await expect(
      page.getByRole("heading", { level: 1, name: "Components" }),
    ).toBeVisible();
    const index = page.getByRole("navigation", { name: "Components" });
    for (const name of ["Colour", "Button", "Dialog", "Toast"]) {
      await expect(index.getByRole("link", { name })).toBeVisible();
    }
    await expect(
      page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: "Components" }),
    ).toHaveCount(0);
  });

  test("a destructive confirm needs the name typed before it enables", async ({
    page,
    context,
  }) => {
    await signIn(context, { perms: [] });
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
