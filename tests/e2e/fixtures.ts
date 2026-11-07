import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export { expect, test } from "@playwright/test";

/**
 * Fails when axe finds a critical or serious WCAG 2.1 AA violation on the page.
 * Moderate and minor findings are reported by axe but do not fail the test.
 */
export async function expectNoA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = results.violations
    .filter(
      (violation) =>
        violation.impact === "critical" || violation.impact === "serious",
    )
    .map(
      (violation) =>
        `${violation.id} (${violation.impact ?? "unknown"}): ${violation.help}`,
    );
  expect(blocking, blocking.join("\n")).toEqual([]);
}
