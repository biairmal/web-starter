import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures";
import {
  type Account,
  createAccount,
  identity,
  login,
  signInWithPassword,
  superAdminToken,
  tenancy,
  uniqueName,
} from "./support";

// APP_FLOW 5.12 (a user's roles), 5.13 (a role's permissions, with a
// version conflict) and 5.14 (delete a role in use), against the real
// identity (FE-42, FE-43, FE-44, FE-45).

test.skip(tenancy !== "single", "single-mode journey");

type Role = { id: string; name: string; version: number };

let admin: Account;

test.beforeAll(async () => {
  admin = await createAccount("admin", ["admin"]);
});

async function adminToken(): Promise<string> {
  return (await login(admin.email, admin.password)).access_token;
}

async function createRole(permissions: string[] = []): Promise<Role> {
  return identity<Role>("POST", "/v1/admin/roles", {
    token: await adminToken(),
    body: { name: uniqueName("Support"), permissions },
  });
}

async function userId(email: string): Promise<string> {
  const users = await identity<{ items?: { id: string }[] }>(
    "GET",
    `/v1/admin/users?search=${encodeURIComponent(email)}`,
    { token: await superAdminToken() },
  );
  const id = users.items?.[0]?.id;
  if (!id) {
    throw new Error(`no user ${email}`);
  }
  return id;
}

function roleRow(page: Page, name: string) {
  return page
    .getByRole("table", { name: "Roles" })
    .getByRole("row")
    .filter({ has: page.getByRole("link", { name, exact: true }) });
}

test("FE-42 an admin gives a user a role; the user's next sign-in carries it", async ({
  page,
}) => {
  const role = await createRole(["users:read"]);
  const member = await createAccount("member", ["member"]);

  await signInWithPassword(
    page,
    admin,
    `/admin/users?search=${encodeURIComponent(member.email)}`,
  );
  await page
    .getByRole("table", { name: "Users" })
    .getByRole("link", { name: member.name })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: member.name }),
  ).toBeVisible();
  const roles = page.getByRole("region", { name: "Roles" });
  await roles.getByRole("button", { name: "Edit roles" }).click();
  await roles.getByRole("checkbox", { name: role.name }).click();
  await roles.getByRole("button", { name: "Save roles" }).click();
  await expect(
    page.getByText(
      `Roles updated. ${member.name} sees the change within 15 minutes.`,
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Revoke sessions now" }).click();
  await expect(
    page.getByText(`${member.name} was signed out everywhere.`),
  ).toBeVisible();

  const tokens = await login(member.email, member.password);
  const me = await identity<{ roles: string[]; permissions: string[] }>(
    "GET",
    "/v1/me",
    { token: tokens.access_token },
  );
  expect(me.roles).toContain(role.name);
  expect(me.permissions).toContain("users:read");
});

test("FE-44 FE-45 editing a role's permissions saves with If-Match, and a stale editor gets the conflict banner", async ({
  page,
  browser,
}) => {
  const role = await createRole();
  await signInWithPassword(page, admin, "/admin/roles");
  await roleRow(page, role.name).getByRole("link", { name: role.name }).click();
  await expect(page).toHaveURL(`/admin/roles/${role.id}`);
  await expect(
    page.getByRole("heading", { level: 1, name: role.name }),
  ).toBeVisible();

  // A second editor opens the same version.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await signInWithPassword(otherPage, admin, `/admin/roles/${role.id}`);
  await expect(
    otherPage.getByRole("heading", { level: 1, name: role.name }),
  ).toBeVisible();

  await page.getByRole("checkbox", { name: "View users" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  await otherPage.getByRole("checkbox", { name: "View the audit log" }).click();
  await otherPage.getByRole("button", { name: "Save" }).click();
  const banner = otherPage.getByRole("alert").filter({
    hasText: "Someone else changed this",
  });
  await expect(banner).toBeVisible();
  // The edit is kept until the editor chooses.
  await expect(
    otherPage.getByRole("checkbox", { name: "View the audit log" }),
  ).toBeChecked();
  await banner.getByRole("button", { name: "Reload" }).click();
  await expect(
    otherPage.getByRole("checkbox", { name: "View users" }),
  ).toBeChecked();
  await expect(
    otherPage.getByRole("checkbox", { name: "View the audit log" }),
  ).not.toBeChecked();
  await other.close();

  const saved = await identity<{ permissions: string[] }>(
    "GET",
    `/v1/admin/roles/${role.id}`,
    { token: await adminToken() },
  );
  expect(saved.permissions).toEqual(["users:read"]);
});

test("FE-43 deleting a role in use asks again, then removes it from its users", async ({
  page,
}) => {
  const role = await createRole();
  const member = await createAccount("holder", ["member"]);
  await identity("PUT", `/v1/admin/users/${await userId(member.email)}/roles`, {
    token: await adminToken(),
    body: { role_ids: [role.id] },
  });

  await signInWithPassword(page, admin, "/admin/roles");
  await roleRow(page, role.name)
    .getByRole("button", { name: `Actions for ${role.name}` })
    .click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Delete role" }).click();
  await expect(dialog.getByText(/1 user has this role/)).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Delete anyway" }),
  ).toBeDisabled();
  await dialog.getByRole("textbox").fill(role.name);
  await dialog.getByRole("button", { name: "Delete anyway" }).click();
  await expect(page.getByText(`Role “${role.name}” deleted.`)).toBeVisible();
  await expect(roleRow(page, role.name)).toHaveCount(0);
});
