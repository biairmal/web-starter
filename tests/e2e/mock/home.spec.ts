import { expect, expectNoA11yViolations, test } from "../fixtures";

test("the starter home page loads with a title and no critical accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Acme Portal");
  await expectNoA11yViolations(page);
});
