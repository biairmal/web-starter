import { expect, expectNoA11yViolations, test } from "../fixtures";
import { signIn } from "../session";

// The example business module (FE-62; docs/adding-a-module.md). Prism serves
// go-service-template's notes API from openapi/notes.json (`bun run mock:notes`),
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

// The list rows are fixed in the browser so there is something to select;
// writes still go through the BFF to Prism, which checks them against
// go-service-template's spec.
const ROWS = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Groceries",
    status: "draft",
    pinned: false,
    version: 1,
    owner_id: "00000000-0000-4000-8000-0000000000b1",
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-02T00:00:00Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    title: "Ideas",
    status: "draft",
    pinned: false,
    version: 1,
    owner_id: "00000000-0000-4000-8000-0000000000b1",
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-03T00:00:00Z",
  },
];

function isList(url: URL) {
  return url.pathname === "/api/notes/notes";
}

test.describe("notes as the reference module", () => {
  test.beforeEach(async ({ page, context }) => {
    await signIn(context, { perms: ["notes:read", "notes:write"] });
    await page.route(isList, (route) =>
      route.request().method() === "GET"
        ? route.fulfill({
            json: {
              data: {
                items: ROWS,
                page: 1,
                size: 25,
                total: 2,
                total_pages: 1,
              },
            },
          })
        : route.fallback(),
    );
  });

  test("bulk delete sends the selected ids to the service", async ({
    page,
  }) => {
    await page.goto("/notes");
    const table = page.getByRole("table", { name: "Notes" });
    await table.getByRole("checkbox", { name: "Select Groceries" }).check();
    await table.getByRole("checkbox", { name: "Select Ideas" }).check();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Delete 2 notes?" });
    await expectNoA11yViolations(page);
    const sent = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/notes/notes/bulk-delete",
    );
    await dialog.getByRole("button", { name: "Delete notes" }).click();
    const response = await sent;
    expect(response.status()).toBe(200);
    expect(response.request().postDataJSON()).toEqual({
      ids: ROWS.map((row) => row.id),
    });
    await expect(page.getByText(/deleted\.$/)).toBeVisible();
  });

  test("a custom title filter goes to the API as value;operator", async ({
    page,
  }) => {
    await page.goto("/notes");
    await page.getByRole("button", { name: "Add filter" }).click();
    await page
      .getByRole("dialog", { name: "Add filter" })
      .getByRole("button", { name: "Title", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("combobox", { name: "Operator" }).click();
    await page.getByRole("option", { name: "is not" }).click();
    await dialog.getByLabel("Title", { exact: true }).fill("Ideas");
    const listed = page.waitForRequest(
      (request) =>
        isList(new URL(request.url())) &&
        new URL(request.url()).searchParams.get("title") === "Ideas;ne",
    );
    await dialog.getByRole("button", { name: "Apply" }).click();
    await listed;
    await expect(page).toHaveURL("/notes?title=Ideas%3Bne");
  });

  test("shift-click adds a second sort column", async ({ page }) => {
    await page.goto("/notes");
    const table = page.getByRole("table", { name: "Notes" });
    await table.getByRole("button", { name: /^Title/ }).click();
    await expect(page).toHaveURL("/notes?sort=title%2CASC");
    const listed = page.waitForRequest(
      (request) =>
        isList(new URL(request.url())) &&
        new URL(request.url()).searchParams.getAll("sort").length === 2,
    );
    await table
      .getByRole("button", { name: /^Updated/ })
      .click({ modifiers: ["Shift"] });
    const sorts = new URL((await listed).url()).searchParams.getAll("sort");
    expect(sorts).toEqual(["title,ASC", "updated_at,ASC"]);
  });
});
