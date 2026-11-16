import { readFileSync } from "node:fs";
import { join } from "node:path";

// Reads the colour tokens from src/app/tokens.css as resolved #rrggbb values,
// so tests can check contrast. Handles hex, var(--x) and
// color-mix(in srgb, A P%, B), which are the only colour forms tokens.css uses.

type Theme = "light" | "dark";

function declarations(css: string, selector: string): [string, string][] {
  const found: [string, string][] = [];
  for (const block of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if ((block[1] ?? "").trim() !== selector) continue;
    for (const decl of (block[2] ?? "").matchAll(
      /--([\w-]+)\s*:\s*([^;]+);/g,
    )) {
      found.push([decl[1] ?? "", (decl[2] ?? "").trim()]);
    }
  }
  return found;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.slice(1);
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function rgbToHex(rgb: readonly number[]): string {
  return `#${rgb
    .map((c) => Math.round(c).toString(16).padStart(2, "0"))
    .join("")}`;
}

function splitTopLevel(args: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of args) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current.trim());
  return parts;
}

function resolve(
  value: string,
  tokens: Map<string, string>,
  depth = 0,
): string | undefined {
  if (depth > 10) return undefined;
  // Prettier wraps long values over several lines.
  const v = value
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/,\s*\)/g, ")")
    .trim();
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v)) {
    return rgbToHex(hexToRgb(v.toLowerCase()));
  }
  const ref = /^var\(--([\w-]+)\)$/.exec(v);
  if (ref) {
    const target = tokens.get(ref[1] ?? "");
    return target === undefined
      ? undefined
      : resolve(target, tokens, depth + 1);
  }
  const mix = /^color-mix\((.*)\)$/.exec(v);
  if (mix) {
    const [space, first, second] = splitTopLevel(mix[1] ?? "");
    if (space !== "in srgb" || !first || !second) return undefined;
    const a = /^(.*?)\s+([\d.]+)%$/.exec(first);
    if (!a) return undefined;
    const colourA = resolve(a[1] ?? "", tokens, depth + 1);
    const colourB = resolve(second, tokens, depth + 1);
    if (!colourA || !colourB) return undefined;
    const share = Number(a[2]) / 100;
    const [ra, rb] = [hexToRgb(colourA), hexToRgb(colourB)];
    return rgbToHex(ra.map((c, i) => c * share + (rb[i] ?? 0) * (1 - share)));
  }
  return undefined;
}

/** Every colour token of a theme, without the leading `--`, as `#rrggbb`. */
export function readTokens(theme: Theme): Record<string, string> {
  const css = readFileSync(
    join(process.cwd(), "src/app/tokens.css"),
    "utf8",
  ).replace(/\/\*[\s\S]*?\*\//g, "");
  const raw = new Map<string, string>(declarations(css, ":root"));
  if (theme === "dark") {
    for (const [name, value] of declarations(css, ':root[data-theme="dark"]')) {
      raw.set(name, value);
    }
  }
  const resolved: Record<string, string> = {};
  for (const [name, value] of raw) {
    const colour = resolve(value, raw);
    if (colour) resolved[name] = colour;
  }
  return resolved;
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio of two #rrggbb colours (1 to 21). */
export function contrast(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}
