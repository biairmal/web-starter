import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Tailwind v4 resets buttons to the default cursor. The base layer in
// globals.css restores a pointer on everything clickable and a not-allowed
// cursor on disabled controls, so components must not set their own cursor.

const root = process.cwd();
const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
const base = css.slice(css.indexOf("@layer base"));

/** The selector list of the first rule in `base` whose body has `cursor`. */
function selectorsFor(cursor: string): string[] {
  const rule = [...base.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find((m) =>
    (m[2] ?? "").includes(`cursor: ${cursor}`),
  );
  expect(rule, `a base rule with cursor: ${cursor}`).toBeDefined();
  return (rule?.[1] ?? "").split(",").map((s) => s.replace(/\s+/g, " ").trim());
}

describe("base interaction layer", () => {
  it("gives clickable elements a pointer", () => {
    const list = selectorsFor("pointer").join(" | ");
    for (const wanted of [
      "button",
      "a[href]",
      "summary",
      "select",
      '[role="menuitem"]',
      '[role="tab"]',
      '[role="option"]',
      '[role="switch"]',
    ]) {
      expect(list, wanted).toContain(wanted);
    }
  });

  it("does not give a pointer to an anchor without href", () => {
    const bareAnchor = selectorsFor("pointer").some((s) =>
      /^a(?![\w[-])/.test(s),
    );
    expect(bareAnchor).toBe(false);
  });

  it("shows not-allowed on disabled controls, after the pointer rule", () => {
    const disabled = selectorsFor("not-allowed").join(" | ");
    for (const wanted of [
      ":disabled",
      '[aria-disabled="true"]',
      "[data-disabled]",
    ]) {
      expect(disabled, wanted).toContain(wanted);
    }
    expect(base.indexOf("cursor: not-allowed")).toBeGreaterThan(
      base.indexOf("cursor: pointer"),
    );
  });

  it("no shadcn primitive sets cursor-default, which would beat the base layer", () => {
    const dir = join(root, "src/components/ui");
    const offenders = readdirSync(dir)
      .filter((f) => f.endsWith(".tsx"))
      .filter((f) =>
        readFileSync(join(dir, f), "utf8").includes("cursor-default"),
      );
    expect(offenders).toEqual([]);
  });

  it("maps the derived primary colours to Tailwind names", () => {
    expect(css).toContain("--color-primary-hover: var(--primary-hover);");
    expect(css).toContain("--color-primary-press: var(--primary-press);");
  });
});
