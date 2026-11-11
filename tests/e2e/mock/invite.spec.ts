import { expect, expectNoA11yViolations, test } from "../fixtures";
import { MOCK_GOOD_TOKEN } from "../mock-users";
import { signIn } from "../session";

// Accept an invite (APP_FLOW 5.7, FE-9).

test.describe("accept invite", () => {
  test("FE-9 a new account sets a password and is signed in", async ({
    page,
    context,
  }) => {
    const response = await page.goto(`/invite#token=${MOCK_GOOD_TOKEN}`);
    expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
    await expect(
      page.getByRole("heading", { level: 1, name: "Join Globex" }),
    ).toBeVisible();
    expect(page.url()).toBe("http://localhost:3000/invite");
    await expectNoA11yViolations(page);

    await page.getByLabel(/Your name/).fill("Bima Sakti");
    await page.getByLabel("Choose a password").fill("saffron-lagoon-bima");
    await page.getByRole("button", { name: "Accept invitation" }).click();
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("button", { name: /Open account menu/ }),
    ).toContainText("Bima Sakti");
    const names = (await context.cookies()).map((cookie) => cookie.name);
    expect(names).toContain("__Host-ws_rt");
  });

  test("FE-9 someone signed in as another user signs out first", async ({
    page,
    context,
  }) => {
    await signIn(context, { name: "Dina Pratama" });
    await page.goto(`/invite#token=${MOCK_GOOD_TOKEN}`);
    await expect(
      page.getByText(
        "You are signed in as Dina Pratama. Sign out to accept this invite for b**@example.test.",
      ),
    ).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByRole("button", { name: "Sign out and continue" }).click();
    await expect(page.getByLabel("Choose a password")).toBeVisible();
    expect(page.url()).toBe("http://localhost:3000/invite");
    const names = (await context.cookies()).map((cookie) => cookie.name);
    expect(names).not.toContain("__Host-ws_rt");
  });

  test("FE-9 an expired invite shows the expired state", async ({ page }) => {
    await page.goto("/invite#token=used-token");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "This invitation has expired or was already used",
      }),
    ).toBeVisible();
    await expectNoA11yViolations(page);
  });
});
