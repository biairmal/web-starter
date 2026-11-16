import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Every token globals.css maps into Tailwind must be defined in tokens.css,
// so a renamed or deleted token fails here instead of silently becoming unset.

const root = join(__dirname, "../../src/app");
const tokens = readFileSync(join(root, "tokens.css"), "utf8");
const globals = readFileSync(join(root, "globals.css"), "utf8");

const defined = new Set(
  [...tokens.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]),
);
const theme = globals.match(/@theme inline\s*\{([^}]*)\}/)?.[1] ?? "";
const referenced = [...theme.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]);

describe("token mapping", () => {
  it("maps something", () => {
    expect(referenced.length).toBeGreaterThan(50);
  });

  it("references only tokens defined in tokens.css", () => {
    const missing = referenced.filter((name) => !defined.has(name));
    expect(missing).toEqual([]);
  });
});
