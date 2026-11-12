import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

// Rebrand smoke test (PRD FE-60, plan F7.4): copy this repo as a fresh
// client would get it, change only what a client changes (src/config/brand.ts,
// the brand tokens in src/app/tokens.css, public/brand/*), install, and run
// the mock e2e suite there. Tests read the brand from brand.ts, so they must
// pass under any brand.
//
//   pnpm rebrand:smoke            # copies to a temp folder
//   pnpm rebrand:smoke -- <dir>   # or into <dir> (must not exist)
//
// Ports 3000, 4010, 4011 and 4012 must be free.

const root = resolve(import.meta.dirname, "..");
const target =
  process.argv.slice(2).find((arg) => arg !== "--") ??
  mkdtempSync(join(tmpdir(), "web-starter-rebrand-"));

const BRAND = {
  appName: "Globex Hub",
  supportEmail: "help@globex.test",
  accent: "#0b6e4c",
  accentDark: "#3ccf91",
};

// Tracked and untracked files, without anything git ignores.
const files = execFileSync(
  "git",
  ["-C", root, "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter((file) => file && !file.startsWith(".claude/"));

console.log(
  `rebrand:smoke: copying ${String(files.length)} files to ${target}`,
);
for (const file of files) {
  const to = join(target, file);
  mkdirSync(dirname(to), { recursive: true });
  try {
    copyFileSync(join(root, file), to);
  } catch {
    // listed but deleted in the working tree
  }
}

function edit(file: string, change: (text: string) => string): void {
  const path = join(target, file);
  const before = readFileSync(path, "utf8");
  const after = change(before);
  if (after === before) {
    throw new Error(`rebrand:smoke: nothing changed in ${file}`);
  }
  writeFileSync(path, after);
}

edit("src/config/brand.ts", (text) =>
  text
    .replace(/appName: "[^"]*"/, `appName: "${BRAND.appName}"`)
    .replace(/supportEmail: "[^"]*"/, `supportEmail: "${BRAND.supportEmail}"`),
);
edit("src/app/tokens.css", (text) =>
  text
    .replace(
      /--brand-accent: #[0-9a-fA-F]{3,8}/,
      `--brand-accent: ${BRAND.accent}`,
    )
    .replace(
      /--brand-accent-dark: #[0-9a-fA-F]{3,8}/,
      `--brand-accent-dark: ${BRAND.accentDark}`,
    ),
);
const logo = (fill: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32"><rect width="32" height="32" rx="8" fill="${fill}"/><text x="40" y="22" font-family="sans-serif" font-size="16" fill="${fill}">Globex</text></svg>\n`;
writeFileSync(join(target, "public/brand/logo.svg"), logo(BRAND.accent));
writeFileSync(
  join(target, "public/brand/logo-dark.svg"),
  logo(BRAND.accentDark),
);
writeFileSync(
  join(target, "public/brand/mark.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${BRAND.accent}"/></svg>\n`,
);

function run(command: string, args: string[]): number {
  return (
    spawnSync(command, args, {
      cwd: target,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, CI: "" },
    }).status ?? 1
  );
}

const status =
  run("pnpm", ["install", "--frozen-lockfile", "--prefer-offline"]) ||
  run("pnpm", ["exec", "playwright", "test", "--project=mock"]);

console.log(
  status === 0
    ? `rebrand:smoke: the mock suite passes as "${BRAND.appName}" (${target}).`
    : `rebrand:smoke: FAILED as "${BRAND.appName}" (${target}).`,
);
process.exit(status);
