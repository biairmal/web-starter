import type { BrowserContext, Page } from "@playwright/test";
import { expect, test } from "../fixtures";
import {
  createAccount,
  identity,
  signInWithPassword,
  superAdminToken,
  tenancy,
} from "./support";

// APP_FLOW 5.8: refresh and session end against the real identity (FE-20,
// FE-21; TRD 5.3). The stack runs identity with a 90 s access token and two
// web replicas behind a proxy, so a refresh happens 30 s after sign-in (the
// middleware refreshes 60 s before expiry) and requests land on both
// replicas.

test.skip(tenancy !== "single", "single-mode journey");

/** Long enough for a fresh access token to enter its refresh window. */
const INTO_REFRESH_WINDOW_MS = 32_000;
/** BFF single-flight entry lifetime (10 s) and identity's reuse grace (10 s). */
const PAST_GRACE_MS = 12_000;

async function accessCookie(context: BrowserContext): Promise<string> {
  const cookie = (await context.cookies()).find(
    (entry) => entry.name === "__Host-ws_at",
  );
  return cookie?.value ?? "";
}

function parallelMe(page: Page, count: number): Promise<number[]> {
  return page.evaluate(
    (n) =>
      Promise.all(
        Array.from({ length: n }, () =>
          fetch("/api/id/me", { cache: "no-store" }).then((r) => r.status),
        ),
      ),
    count,
  );
}

test("FE-21 ten parallel requests at the refresh point all succeed and the session stays", async ({
  page,
  context,
}) => {
  const account = await createAccount("refresh", ["member"]);
  await signInWithPassword(page, account);
  const before = await accessCookie(context);

  await page.waitForTimeout(INTO_REFRESH_WINDOW_MS);
  expect(await parallelMe(page, 10)).toEqual(Array(10).fill(200));

  await page.reload();
  await expect(page).toHaveURL("/");
  expect(await accessCookie(context)).not.toBe(before);

  // And again on the rotated token, which must still be valid everywhere.
  await page.waitForTimeout(INTO_REFRESH_WINDOW_MS);
  expect(await parallelMe(page, 10)).toEqual(Array(10).fill(200));
  await page.goto("/account");
  await expect(page).toHaveURL("/account");
});

test("FE-21 a refresh token used again after the grace window ends the session", async ({
  page,
  context,
  browser,
}) => {
  const account = await createAccount("reuse", ["member"]);
  await signInWithPassword(page, account);
  const copy = await browser.newContext();
  await copy.addCookies(await context.cookies());

  await page.waitForTimeout(INTO_REFRESH_WINDOW_MS);
  await page.goto("/account");
  await expect(page).toHaveURL("/account");

  await page.waitForTimeout(PAST_GRACE_MS);
  const copyPage = await copy.newPage();
  await copyPage.goto("/account");
  await expect(copyPage).toHaveURL(
    "/sign-in?reason=REFRESH_REUSED&next=%2Faccount",
  );
  await expect(copyPage.getByRole("status").first()).toBeVisible();
  await copy.close();
});

test("FE-20 an admin revoking a user's sessions signs them out", async ({
  page,
}) => {
  const account = await createAccount("revoked", ["member"]);
  await signInWithPassword(page, account);

  const token = await superAdminToken();
  const users = await identity<{ items?: { id: string }[] }>(
    "GET",
    `/v1/admin/users?search=${encodeURIComponent(account.email)}`,
    { token },
  );
  const id = users.items?.[0]?.id;
  expect(id).toBeDefined();
  await identity("POST", `/v1/admin/users/${id ?? ""}/revoke-sessions`, {
    token,
  });

  // At the latest when the access token reaches its refresh window.
  await expect(async () => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/sign-in\?reason=/);
  }).toPass({ timeout: 90_000, intervals: [5_000] });
});
