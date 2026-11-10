import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Page } from "@playwright/test";

export { expect };

/**
 * Playwright's `test`, plus an automatic check that the page reported no
 * Content Security Policy violation during the test (TRD 11.2).
 */
export const test = base.extend<{ noCspViolations: undefined }>({
  noCspViolations: [
    async ({ page }, use) => {
      const violations: string[] = [];
      page.on("console", (message) => {
        if (/content security policy/i.test(message.text())) {
          violations.push(message.text());
        }
      });
      // Init scripts are injected by Playwright, so the CSP does not block them.
      await page.addInitScript(() => {
        document.addEventListener("securitypolicyviolation", (event) => {
          console.error(
            `Content Security Policy violation: ${event.violatedDirective} blocked ${event.blockedURI}`,
          );
        });
      });
      await use(undefined);
      expect(violations, violations.join("\n")).toEqual([]);
    },
    { auto: true },
  ],
});

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
