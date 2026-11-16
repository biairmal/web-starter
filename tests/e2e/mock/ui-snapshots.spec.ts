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

// The wordmark renders a light and a dark logo and shows one by theme. In
// each theme exactly one must be displayed, loaded and non-empty, so a logo
// is never missing against its background.
for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`logo in the ${colorScheme} theme`, () => {
    test.use({ colorScheme });

    test("exactly one logo is shown, loaded and sized", async ({ page }) => {
      await page.goto("/sign-in");
      const shown = await page
        .locator("main a[href='/'] img")
        .evaluateAll((images) =>
          images
            .map((img) => {
              const el = img as HTMLImageElement;
              const box = el.getBoundingClientRect();
              return {
                display: getComputedStyle(el).display,
                loaded: el.complete && el.naturalWidth > 0,
                width: box.width,
                src: el.getAttribute("src"),
              };
            })
            .filter((image) => image.display !== "none"),
        );
      expect(shown).toHaveLength(1);
      expect(shown[0]?.loaded).toBe(true);
      expect(shown[0]?.width ?? 0).toBeGreaterThan(0);
      expect(shown[0]?.src).toBe(
        colorScheme === "dark" ? "/brand/logo-dark.svg" : "/brand/logo.svg",
      );
    });
  });
}

const snapshotDir = process.env.UI_SNAPSHOTS
  ? (process.env.UI_SNAPSHOT_DIR ?? ".ui-review/after")
  : undefined;

const screens = [
  ["home", "/"],
  ["users", "/admin/users"],
  ["roles", "/admin/roles"],
  ["audit", "/admin/audit"],
  ["users-filtered", "/admin/users?status=active"],
  ["audit-filtered", "/admin/audit?action=role.&from=2026-11-10&to=2026-11-10"],
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

// The open "Add filter" panel (a popover on desktop, a sheet on mobile). It
// has no counterpart before the filter bar existed, so it is opt-in as well.
test.describe("UI snapshot: filter menus", () => {
  test.skip(
    !snapshotDir || !process.env.UI_SNAPSHOT_MENUS,
    "set UI_SNAPSHOTS=1 and UI_SNAPSHOT_MENUS=1 to capture the filter menus",
  );

  for (const viewport of viewports) {
    test(`UI snapshot: users add-filter menu ${viewport.name}`, async ({
      page,
      context,
    }) => {
      await signIn(context, { name: "Ada Admin", sa: true });
      await page.setViewportSize(viewport);
      await page.goto("/admin/users");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.getByRole("button", { name: "Add filter" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.waitForTimeout(400);
      const dir = snapshotDir ?? ".ui-review/after";
      mkdirSync(dir, { recursive: true });
      await page.screenshot({
        path: join(dir, `users-add-filter-menu-${viewport.name}.png`),
      });
    });
  }
});
