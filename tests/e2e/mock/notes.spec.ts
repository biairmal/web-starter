import { expect, expectNoA11yViolations, test } from "../fixtures";
import { signIn } from "../session";

// The example business module (FE-62; docs/adding-a-module.md). Prism serves
// go-service-template's notes API from openapi/notes.json (`pnpm mock:notes`),
// so the rows are random; these tests check the wiring, not the data.

test.describe("notes module", () => {
  test("FE-62 opens from the sidebar with notes:read and lists notes through the BFF, axe clean", async ({
    page,
    context,
  }) => {
    await signIn(context, { perms: ["notes:read"] });
    await page.goto("/");
    const list = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/notes/notes" &&
        response.request().method() === "GET",
    );
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Notes" })
      .click();
    await expect(page).toHaveURL("/notes");
    expect((await list).status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Notes" })).toBeVisible();
    // Prism's random page may be empty, so the table or the empty state.
    await expect(page.getByRole("group", { name: "Status" })).toBeVisible();
    await expect(page.getByRole("button", { name: "New note" })).toHaveCount(0);
    await expectNoA11yViolations(page);
  });

  test("FE-62 with notes:write a new note goes to the service", async ({
    page,
    context,
  }) => {
    await signIn(context, { perms: ["notes:read", "notes:write"] });
    await page.goto("/notes");
    await page.getByRole("button", { name: "New note" }).click();
    const dialog = page.getByRole("dialog", { name: "New note" });
    await dialog.getByLabel("Title").fill("Groceries");
    await dialog.getByLabel("Text").fill("Milk, eggs");
    await expectNoA11yViolations(page);
    const created = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/notes/notes" &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Create note" }).click();
    expect((await created).status()).toBe(201);
    await expect(page.getByText("Note created.")).toBeVisible();
  });

  test("a user without notes:read sees no Notes link and gets 403", async ({
    page,
    context,
  }) => {
    await signIn(context, { perms: ["users:read"] });
    await page.goto("/");
    await expect(
      page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: "Notes" }),
    ).toHaveCount(0);
    const response = await page.goto("/notes");
    expect(response?.status()).toBe(403);
  });
});
