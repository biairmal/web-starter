import { expect, expectNoA11yViolations, test } from "../fixtures";
import { signIn } from "../session";

// The security page: sessions, sign out everywhere, and Google (FE-22,
// FE-33; APP_FLOW 5.9, 5.16). The mock identity keeps revoked sessions and
// unlinked Google per session ID, so each test has its own.

test.describe("account security", () => {
  test("FE-33 lists sessions and revokes another device", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: "00000000-0000-4000-8000-0000000000c1" });
    await page.goto("/account/security");
    const sessions = page.getByRole("region", { name: "Sessions" });
    await expect(sessions.getByRole("listitem")).toHaveCount(2);
    await expect(
      sessions.getByRole("listitem").first().getByText("Current session"),
    ).toBeVisible();
    await expectNoA11yViolations(page);

    await sessions
      .getByRole("button", { name: "Revoke the session on Safari on iOS" })
      .click();
    await expect(page.getByText("Safari on iOS was signed out.")).toBeVisible();
    await expect(sessions.getByRole("listitem")).toHaveCount(1);
  });

  test("FE-22 revoking the current session signs this device out", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: "00000000-0000-4000-8000-0000000000c2" });
    await page.goto("/account/security");
    await page
      .getByRole("region", { name: "Sessions" })
      .getByRole("button", { name: "Sign out" })
      .click();
    await expect(page).toHaveURL("/sign-in");
    expect(await context.cookies()).toEqual([]);
  });

  test("FE-22 sign out everywhere confirms with a count", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: "00000000-0000-4000-8000-0000000000c3" });
    await page.goto("/account/security");
    await expect(
      page.getByRole("region", { name: "Sessions" }).getByRole("listitem"),
    ).toHaveCount(2);
    await page.getByRole("button", { name: "Sign out everywhere" }).click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByText(
        "This ends 1 other session and signs you out on this device.",
      ),
    ).toBeVisible();
    await expectNoA11yViolations(page);
    await dialog.getByRole("button", { name: "Sign out everywhere" }).click();
    await expect(page).toHaveURL("/sign-in");
    expect(await context.cookies()).toEqual([]);
  });

  test("FE-33 Link Google redirects through identity and returns with a toast", async ({
    page,
    context,
  }) => {
    await signIn(context, { sid: "00000000-0000-4000-8000-0000000000c4" });
    await page.goto("/account/security");
    await expect(
      page.getByRole("link", { name: "Link Google" }),
    ).toHaveAttribute("href", "/api/auth/google/link");

    const start = await page.request.get("/api/auth/google/link", {
      maxRedirects: 0,
    });
    expect(start.status()).toBe(302);
    const target = new URL(start.headers().location ?? "");
    expect(target.pathname).toBe("/stand-in-google");
    expect(target.searchParams.get("redirect_to")).toBe(
      "http://localhost:3000/auth/callback",
    );
    expect(start.headers()["set-cookie"]).toMatch(/__Host-ws_next=/);

    // Identity sends the browser back here after Google.
    await page.goto("/auth/callback?linked=1");
    await expect(page.getByText("Google linked")).toBeVisible();
    await expect(page).toHaveURL("/account/security");
  });

  test("FE-33 the last sign-in method cannot be unlinked", async ({
    page,
    context,
  }) => {
    await signIn(context, {
      sid: "00000000-0000-4000-8000-0000000000c5",
      providers: { password: false, google: true },
    });
    await page.goto("/account/security");
    await expect(page.getByRole("button", { name: "Unlink" })).toBeDisabled();
    await expect(
      page.getByText("Keep at least one way to sign in.").last(),
    ).toBeVisible();
    await page.getByRole("link", { name: "Set a password first" }).click();
    await expect(page).toHaveURL("/account#password");
    await expect(
      page.getByRole("heading", { level: 2, name: "Set a password" }),
    ).toBeVisible();
  });

  test("FE-33 unlinks Google when a password is set", async ({
    page,
    context,
  }) => {
    await signIn(context, {
      sid: "00000000-0000-4000-8000-0000000000c6",
      providers: { password: true, google: true },
    });
    await page.goto("/account/security");
    await page.getByRole("button", { name: "Unlink" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Unlink" })
      .click();
    await expect(page.getByText("Google unlinked")).toBeVisible();
    await expect(page.getByRole("link", { name: "Link Google" })).toBeVisible();
  });
});
