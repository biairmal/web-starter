import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "../fixtures";
import { signIn } from "../session";

// Real-browser checks for the base interaction layer (globals.css), and, when
// UI_SNAPSHOTS is set, full-page screenshots of the main screens in both
// themes and two widths, for before/after comparison in a pull request:
//
//   UI_SNAPSHOTS=1 UI_SNAPSHOT_DIR=.ui-review/before bun run e2e:mock --grep "UI snapshot"

test.describe("base interaction layer in a browser", () => {
  test("clickable things get a pointer and disabled ones not-allowed", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    const cursors = await page.evaluate(() => {
      const read = (html: string): string => {
        const host = document.createElement("div");
        host.innerHTML = html;
        document.body.append(host);
        const cursor = getComputedStyle(
          host.firstElementChild as Element,
        ).cursor;
        host.remove();
        return cursor;
      };
      return {
        button: read("<button>x</button>"),
        disabledButton: read("<button disabled>x</button>"),
        link: read('<a href="/x">x</a>'),
        anchorWithoutHref: read("<a>x</a>"),
        menuItem: read('<div role="menuitem">x</div>'),
        disabledMenuItem: read('<div role="menuitem" data-disabled>x</div>'),
      };
    });
    expect(cursors).toEqual({
      button: "pointer",
      disabledButton: "not-allowed",
      link: "pointer",
      anchorWithoutHref: "auto",
      menuItem: "pointer",
      disabledMenuItem: "not-allowed",
    });
  });

  test("the real Sign in button shows a pointer", async ({ page }) => {
    await page.goto("/sign-in");
    const cursor = await page
      .getByRole("button", { name: "Sign in" })
      .evaluate((el) => getComputedStyle(el).cursor);
    expect(cursor).toBe("pointer");
  });

  test("a focused field keeps the accent border while the mouse is over it", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    const email = page.getByLabel("Email");
    await email.focus();
    await email.hover();
    const accent = await email.evaluate((_, name) => {
      const probe = document.createElement("span");
      probe.style.color = `var(${name})`;
      document.body.append(probe);
      const colour = getComputedStyle(probe).color;
      probe.remove();
      return colour;
    }, "--brand-accent");
    // The border animates (transition-colors), so wait for it to settle.
    await expect
      .poll(() => email.evaluate((el) => getComputedStyle(el).borderTopColor))
      .toBe(accent);
  });
});

const snapshotDir = process.env.UI_SNAPSHOTS
  ? (process.env.UI_SNAPSHOT_DIR ?? ".ui-review/after")
  : undefined;

const screens = [
  ["home", "/"],
  ["users", "/admin/users"],
  ["roles", "/admin/roles"],
  ["audit", "/admin/audit"],
] as const;

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`UI snapshot: ${colorScheme}`, () => {
    test.use({ colorScheme });
    test.skip(!snapshotDir, "set UI_SNAPSHOTS=1 to capture screenshots");

    for (const viewport of viewports) {
      for (const [name, path] of screens) {
        test(`UI snapshot: ${name} ${viewport.name} ${colorScheme}`, async ({
          page,
          context,
        }) => {
          await signIn(context, { name: "Ada Admin", sa: true });
          await page.setViewportSize(viewport);
          await page.goto(path);
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
          // Let list data and skeletons settle.
          await page.waitForTimeout(800);
          const dir = snapshotDir ?? ".ui-review/after";
          mkdirSync(dir, { recursive: true });
          await page.screenshot({
            path: join(dir, `${name}-${viewport.name}-${colorScheme}.png`),
            fullPage: true,
          });
        });
      }
    }
  });
}
