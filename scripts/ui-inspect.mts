import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

// Looks at running pages in a real browser: a full-page screenshot per
// viewport, horizontal overflow, console errors, and the first Tab stops.
// It reports facts; judging hierarchy and polish is still a human's (or a
// reviewer skill's) job. Screenshots go to .ui-review/ (git-ignored).
//
//   bun run dev                                     # app must be running
//   bun run ui:inspect /sign-in /forgot-password    # paths or full URLs
//
// UI_BASE_URL sets the origin for paths (default http://localhost:3000).
// UI_STORAGE_STATE points at a Playwright storage-state file to inspect
// pages behind sign-in; a page that redirects shows its final URL.

const base = process.env.UI_BASE_URL ?? "http://localhost:3000";
const storageState = process.env.UI_STORAGE_STATE;
const outDir = ".ui-review";
const TAB_STOPS = 12;
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
  { name: "narrow", width: 320, height: 640 },
];

const targets = process.argv.slice(2);
if (targets.length === 0) targets.push("/sign-in");
mkdirSync(outDir, { recursive: true });

// Names can include a person's email (user menu); never print one.
const safe = (text: string) => (text.includes("@") ? "[redacted]" : text);

const browser = await chromium.launch();
let problems = 0;
try {
  for (const target of targets) {
    const url = new URL(target, base);
    const slug =
      url.pathname.replace(/\W+/g, "-").replace(/^-|-$/g, "") || "index";
    console.log(`\n${url.href}`);

    for (const [index, vp] of viewports.entries()) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        ...(storageState ? { storageState } : {}),
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(safe(msg.text().slice(0, 160)));
      });
      page.on("pageerror", (err) =>
        errors.push(safe(err.message.slice(0, 160))),
      );

      try {
        const response = await page.goto(url.href, { waitUntil: "load" });
        await page.waitForTimeout(500);
        const file = join(outDir, `${slug}-${vp.name}.png`);
        await page.screenshot({ path: file, fullPage: true });
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        const notes = [
          `status ${String(response?.status() ?? "?")}`,
          new URL(page.url()).pathname !== url.pathname
            ? `redirected to ${new URL(page.url()).pathname}`
            : "",
          overflow > 0 ? `HORIZONTAL OVERFLOW ${String(overflow)}px` : "",
          errors.length > 0 ? `${String(errors.length)} console error(s)` : "",
        ].filter(Boolean);
        if (overflow > 0 || errors.length > 0) problems++;
        console.log(
          `  ${vp.name.padEnd(7)} ${String(vp.width)}x${String(vp.height)}  ${file}  ${notes.join("; ")}`,
        );
        for (const e of errors) console.log(`    error: ${e}`);

        if (index === 0) {
          // Focus order does not change with width, so check it once.
          console.log("  keyboard (Tab order, ring = visible focus style):");
          for (let i = 1; i <= TAB_STOPS; i++) {
            await page.keyboard.press("Tab");
            const stop = await page.evaluate(() => {
              const el = document.activeElement;
              if (!el || el === document.body) return null;
              const style = getComputedStyle(el);
              const ring =
                (style.outlineStyle !== "none" &&
                  parseFloat(style.outlineWidth) > 0) ||
                style.boxShadow !== "none";
              const name =
                el.getAttribute("aria-label") ??
                (el instanceof HTMLInputElement
                  ? el.labels?.[0]?.textContent
                  : null) ??
                el.textContent;
              return {
                tag: el.tagName.toLowerCase(),
                role: el.getAttribute("role") ?? "",
                name: name.trim().replace(/\s+/g, " ").slice(0, 40),
                ring,
              };
            });
            if (!stop) break;
            if (!stop.ring) problems++;
            console.log(
              `    ${String(i).padStart(2)}. <${stop.tag}${stop.role ? ` role=${stop.role}` : ""}> "${safe(stop.name)}" ${stop.ring ? "ring" : "NO VISIBLE FOCUS STYLE"}`,
            );
          }
        }
      } catch (err) {
        problems++;
        console.log(
          `  ${vp.name.padEnd(7)} FAILED: ${err instanceof Error ? err.message.slice(0, 160) : "unknown error"}`,
        );
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

console.log(
  problems === 0
    ? "\nui-inspect: no overflow, console errors or missing focus styles found."
    : `\nui-inspect: ${String(problems)} problem(s) above.`,
);
process.exit(problems === 0 ? 0 : 1);
