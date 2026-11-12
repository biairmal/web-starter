import { randomBytes } from "node:crypto";
import { expect, test } from "../fixtures";
import {
  PASSWORD,
  SUPER_ADMIN,
  createAccount,
  identity,
  mailLinks,
  nextMailLink,
  signInWithPassword,
  superAdminToken,
  tenancy,
  tokenOf,
  uniqueEmail,
  uniqueName,
} from "./support";

// Multi mode against the real identity: APP_FLOW 5.2 (the tenant picker),
// 5.10 (switch tenant) and 5.15 (the super admin's tenants) (FE-8, FE-31,
// FE-50, FE-51). Runs in the multi pass of `pnpm e2e:full`.

test.skip(tenancy !== "multi", "multi-mode journey");

type Tenant = { id: string; slug: string; name: string };

function uniqueSlug(tag: string): string {
  return `${tag}-${randomBytes(3).toString("hex")}`;
}

/** A new tenant whose first admin accepts the invite with PASSWORD. */
async function tenantWithAdmin(email: string): Promise<Tenant> {
  const slug = uniqueSlug("acme");
  const known = mailLinks(email, "invite").length;
  const tenant = await identity<Tenant>("POST", "/v1/admin/tenants", {
    token: await superAdminToken(),
    body: { slug, name: uniqueName("Acme"), first_admin_email: email },
  });
  const link = await nextMailLink(email, "invite", known);
  await identity("POST", "/v1/auth/invite/accept", {
    body: { token: tokenOf(link), password: PASSWORD, display_name: "Ayu" },
  });
  return tenant;
}

test("FE-8 FE-31 a user in two tenants picks one at sign-in, then switches with a full reload", async ({
  page,
}) => {
  const email = uniqueEmail("multi");
  const acme = await tenantWithAdmin(email);

  // The same person joins the default tenant too (an existing account).
  const known = mailLinks(email, "invite").length;
  const token = await superAdminToken();
  const roles = await identity<{ items?: { id: string; name: string }[] }>(
    "GET",
    "/v1/admin/roles?size=100",
    { token },
  );
  const member = roles.items?.find((role) => role.name === "member");
  await identity("POST", "/v1/admin/users/invite", {
    token,
    body: { email, role_ids: [member?.id] },
  });
  const link = await nextMailLink(email, "invite", known);
  await identity("POST", "/v1/auth/invite/accept", {
    body: { token: tokenOf(link) },
  });

  await page.goto("/sign-in?next=%2F");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/sign-in/tenant");
  await expect(
    page.getByRole("heading", { level: 1, name: "Choose a workspace" }),
  ).toBeVisible();
  await page.getByRole("button", { name: new RegExp(acme.name) }).click();
  await expect(page).toHaveURL("/");
  await expect(
    page.getByText(new RegExp(`signed in to ${acme.name}`)),
  ).toBeVisible();

  await page.getByRole("button", { name: /Switch tenant/ }).click();
  const reload = page.waitForEvent("load");
  await page.getByRole("menuitemradio", { name: /Default/ }).click();
  await reload;
  await expect(page).toHaveURL("/");
  await expect(page.getByText(/signed in to Default/)).toBeVisible();
});

test("FE-50 FE-51 the super admin creates a tenant, suspends it, reactivates it and opens it", async ({
  page,
}) => {
  const name = uniqueName("Sinar");
  const owner = uniqueEmail("owner");
  await signInWithPassword(
    page,
    { email: SUPER_ADMIN.email, password: SUPER_ADMIN.password },
    "/admin/tenants",
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Tenants" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Create tenant" }).click();
  const dialog = page.getByRole("dialog", { name: "Create tenant" });
  await dialog.getByLabel(/^Name/).fill(name);
  await dialog.getByLabel(/^Slug/).fill(uniqueSlug("sinar"));
  await dialog.getByLabel(/First admin/).fill(owner);
  await dialog.getByRole("button", { name: "Create tenant" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(
    page.getByText(`Tenant created. Invite sent to ${owner}.`),
  ).toBeVisible();
  await nextMailLink(owner, "invite");

  await page.getByRole("button", { name: "Suspend tenant" }).click();
  const suspend = page.getByRole("dialog", { name: `Suspend ${name}?` });
  await suspend.getByLabel(new RegExp(`Type ${name}`)).fill(name);
  await suspend.getByRole("button", { name: "Suspend tenant" }).click();
  await expect(page.getByText(`${name} is suspended.`)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open as admin" }),
  ).toBeDisabled();

  await page.getByRole("button", { name: "Reactivate tenant" }).click();
  await page
    .getByRole("dialog", { name: `Reactivate ${name}?` })
    .getByRole("button", { name: "Reactivate tenant" })
    .click();
  await expect(page.getByText(`${name} is active again.`)).toBeVisible();

  await page.getByRole("button", { name: "Open as admin" }).click();
  await expect(page).toHaveURL("/");
  await expect(
    page.getByText(new RegExp(`signed in to ${name}`)),
  ).toBeVisible();
});

test("a suspended tenant's members cannot sign in to it", async ({ page }) => {
  const email = uniqueEmail("suspended");
  const acme = await tenantWithAdmin(email);
  const token = await superAdminToken();
  const current = await identity<{ version: number }>(
    "GET",
    `/v1/admin/tenants/${acme.id}`,
    { token },
  );
  await identity("PATCH", `/v1/admin/tenants/${acme.id}`, {
    token,
    headers: { "If-Match": `"${String(current.version)}"` },
    body: { status: "suspended" },
  });

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(/can’t sign in/i).first()).toBeVisible();
  await expect(page).not.toHaveURL("/");
});

test("an account in one tenant signs in without the picker", async ({
  page,
}) => {
  const account = await createAccount("single", ["member"]);
  await signInWithPassword(page, account);
});
