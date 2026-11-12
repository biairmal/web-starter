import { expect, test } from "../fixtures";
import {
  PASSWORD,
  createAccount,
  nextMailLink,
  openAccountMenu,
  pathOf,
  signInWithPassword,
  uniqueEmail,
  uniqueName,
  tenancy,
} from "./support";

// APP_FLOW 5.11 (an admin invites) and 5.7 (the invitee accepts) (FE-9,
// FE-41).

test.skip(tenancy !== "single", "single-mode journey");

test("FE-41 FE-9 an admin invites a user, who accepts from the mailed link and is signed in", async ({
  page,
  browser,
}) => {
  const admin = await createAccount("inviter", ["admin"]);
  const email = uniqueEmail("invitee");
  const name = uniqueName("Bima");

  await signInWithPassword(page, admin, "/admin/users");
  await page.getByRole("button", { name: "Invite user" }).click();
  const dialog = page.getByRole("dialog", { name: "Invite a user" });
  await dialog.getByRole("textbox", { name: /Email/ }).fill(email);
  await dialog.getByRole("textbox", { name: /Name/ }).fill(name);
  await dialog.getByRole("button", { name: "Send invitation" }).click();
  await expect(dialog.getByText("Choose at least one role.")).toBeVisible();
  await dialog.getByRole("checkbox", { name: /member/i }).click();
  await dialog.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByText(`Invite sent to ${email}`)).toBeVisible();
  await page.getByRole("button", { name: "Invited" }).click();
  await expect(
    page.getByRole("table", { name: "Users" }).getByRole("link", { name }),
  ).toBeVisible();

  const link = await nextMailLink(email, "invite");
  expect(new URL(link).pathname).toBe("/invite");

  // Opened in the admin's browser, it asks to sign out first.
  await page.goto(pathOf(link));
  await expect(page.getByText(/You are signed in as/)).toBeVisible();

  const invitee = await browser.newContext();
  const inviteePage = await invitee.newPage();
  await inviteePage.goto(pathOf(link));
  await expect(
    inviteePage.getByRole("heading", { level: 1, name: /^Join / }),
  ).toBeVisible();
  expect(new URL(inviteePage.url()).hash).toBe("");
  await inviteePage.getByLabel(/Your name/).fill(name);
  await inviteePage.getByLabel("Choose a password").fill(PASSWORD);
  await inviteePage.getByRole("button", { name: "Accept invitation" }).click();
  await expect(inviteePage).toHaveURL("/");
  await expect(
    inviteePage.getByRole("button", { name: /Open account menu/ }),
  ).toContainText(name);
  await openAccountMenu(inviteePage);
  await inviteePage.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(inviteePage).toHaveURL("/sign-in");

  await signInWithPassword(inviteePage, { email, password: PASSWORD });
  await invitee.close();

  // Used once. A fresh document: the admin's page is still on /invite.
  await page.context().clearCookies();
  await page.goto("about:blank");
  await page.goto(pathOf(link));
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "This invitation has expired or was already used",
    }),
  ).toBeVisible();
});
