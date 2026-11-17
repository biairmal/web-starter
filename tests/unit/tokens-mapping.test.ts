import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

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

  it("gives no type role the name of a colour (text-X would be ambiguous)", () => {
    const names = (prefix: string) =>
      new Set(
        [...theme.matchAll(new RegExp(`${prefix}([\\w-]+?)\\s*:`, "g"))]
          .map((m) => m[1])
          .filter((name) => !name?.includes("--")),
      );
    const colors = names("--color-");
    const clashes = [...names("--text-")].filter((name) => colors.has(name));
    expect(clashes).toEqual([]);
  });
});

const themeNames = (prefix: string) => [
  ...new Set(
    [...theme.matchAll(new RegExp(`${prefix}([\\w-]+?)\\s*:`, "g"))]
      .map((m) => m[1] ?? "")
      .filter((name) => name && !name.includes("--")),
  ),
];

describe("class merging knows the theme", () => {
  it("keeps every type role next to a text colour", () => {
    const lost = themeNames("--text-").filter(
      (name) =>
        !cn(`text-${name}`, "text-muted-foreground").includes(`text-${name}`),
    );
    expect(lost).toEqual([]);
  });

  it("lets a later spacing class replace every spacing token", () => {
    const kept = themeNames("--spacing-").filter(
      (name) => cn(`p-${name}`, "p-2") !== "p-2",
    );
    expect(kept).toEqual([]);
  });
});

describe("toaster", () => {
  it("reads only tokens that exist", () => {
    const sonner = readFileSync(
      join(__dirname, "../../src/components/ui/sonner.tsx"),
      "utf8",
    );
    const used = [...sonner.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(0);
    expect(used.filter((name) => !defined.has(name))).toEqual([]);
  });
});
