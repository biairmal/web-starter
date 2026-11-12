import { expect, expectNoA11yViolations, test } from "../fixtures";
import { brand } from "@/config/brand";

test("a signed-out visitor to / is sent to sign-in with next, on a page with no critical accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in\?next=%2F$/);
  await expect(page).toHaveTitle(`Sign in · ${brand.appName}`);
  await expectNoA11yViolations(page);
});
