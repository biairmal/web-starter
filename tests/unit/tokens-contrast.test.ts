import { describe, expect, it } from "vitest";
import { contrast, readTokens } from "../helpers/css-tokens";

// Every text, accent and status colour keeps at least WCAG AA contrast in both
// themes. The pairs are read from src/app/tokens.css, so changing the accent
// (or its label colour) without re-checking fails here.

const MIN = 4.5;

const pairs: readonly (readonly [string, string])[] = [
  ["text", "surface"],
  ["text", "frame"],
  ["muted", "surface"],
  ["muted", "frame"],
  ["faint", "surface"],
  ["faint", "frame"],
  ["brand-accent", "surface"],
  ["brand-accent", "frame"],
  ["primary-ink", "primary"],
  ["primary-ink", "primary-hover"],
  ["primary-ink", "primary-press"],
  ["text", "active"],
  ["pill-positive-ink", "pill-positive-bg"],
  ["pill-negative-ink", "pill-negative-bg"],
  ["pill-warning-ink", "pill-warning-bg"],
  ["pill-neutral-ink", "pill-neutral-bg"],
];

describe("contrast helper", () => {
  it("black on white is 21:1", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  // Not the exact colour: DESIGN.md tells a client to change the accent and
  // run this file, so it must stay green for any accent that keeps contrast.
  it("reads the accent from tokens.css as a resolved colour", () => {
    expect(readTokens("light")["brand-accent"]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("derives hover from the accent with color-mix, not a copy of it", () => {
    for (const theme of ["light", "dark"] as const) {
      const tokens = readTokens(theme);
      expect(tokens["primary-hover"]).toMatch(/^#[0-9a-f]{6}$/);
      expect(tokens["primary-hover"]).not.toBe(tokens["brand-accent"]);
    }
  });

  it("reads a different dark theme than light", () => {
    expect(readTokens("dark").surface).not.toBe(readTokens("light").surface);
  });

  it("refuses CSS whose dark block it cannot find, instead of reusing light", () => {
    const lightOnly = ":root { --surface: #ffffff; }";
    expect(() => readTokens("dark", lightOnly)).toThrow(/dark/);
  });
});

describe.each(["light", "dark"] as const)("%s theme tokens", (theme) => {
  const tokens = readTokens(theme);

  it.each(pairs)("%s on %s is at least 4.5:1", (fg, bg) => {
    const fgColour = tokens[fg];
    const bgColour = tokens[bg];
    expect(fgColour, `token ${fg}`).toBeDefined();
    expect(bgColour, `token ${bg}`).toBeDefined();
    expect(contrast(fgColour ?? "", bgColour ?? "")).toBeGreaterThanOrEqual(
      MIN,
    );
  });
});
