import { expect, expectNoA11yViolations, test } from "../fixtures";

test("a signed-out visitor to / is sent to sign-in with next, on a page with no critical accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in\?next=%2F$/);
  await expect(page).toHaveTitle("Sign in · Acme Portal");
  await expectNoA11yViolations(page);
});
