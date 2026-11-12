import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

// TRD 12 bundle budget: the JavaScript a browser downloads for /sign-in,
// gzipped, after `pnpm build`. That is the page and every layout and
// boundary (error, not-found, forbidden…) of the segments above it, which the
// App Router loads with the page. Legacy polyfills (loaded only by browsers
// without ES modules) are left out. Exits 1 over budget.
//
//   pnpm build && pnpm budget

const BUDGETS_KB: Record<string, number> = {
  "/(public)/sign-in/page": 200,
};

/** Files a segment may have that load with every page below it. */
const SEGMENT_FILES = [
  "layout",
  "template",
  "error",
  "loading",
  "not-found",
  "forbidden",
  "unauthorized",
];

/** "/(public)/sign-in/page" → its own entry plus those of "", "/(public)", "/(public)/sign-in". */
function routeEntries(route: string): string[] {
  const parts = route.split("/").slice(1, -1);
  const segments = parts.map((_, index) => parts.slice(0, index + 1).join("/"));
  return [
    "/global-error",
    ...["", ...segments.map((segment) => `/${segment}`)].flatMap((segment) =>
      SEGMENT_FILES.map((file) => `${segment}/${file}`),
    ),
    route,
  ];
}

const root = resolve(import.meta.dirname, "..");
const next = join(root, ".next");

type AppManifest = { pages: Record<string, string[]> };
type BuildManifest = { rootMainFiles?: string[]; polyfillFiles?: string[] };

function readJson(file: string): unknown {
  const path = join(next, file);
  if (!existsSync(path)) {
    console.error(`budget: ${path} not found. Run \`pnpm build\` first.`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

const app = readJson("app-build-manifest.json") as AppManifest;
const build = readJson("build-manifest.json") as BuildManifest;
const polyfills = new Set(build.polyfillFiles ?? []);

function gzipKb(file: string): number {
  return gzipSync(readFileSync(join(next, file)), { level: 9 }).length / 1024;
}

let over = false;
for (const [route, budget] of Object.entries(BUDGETS_KB)) {
  const files = [
    ...new Set([
      ...routeEntries(route).flatMap((entry) => app.pages[entry] ?? []),
      ...(build.rootMainFiles ?? []),
    ]),
  ].filter((file) => file.endsWith(".js") && !polyfills.has(file));
  const sizes = files
    .map((file) => ({ file, kb: gzipKb(file) }))
    .sort((a, b) => b.kb - a.kb);
  const total = sizes.reduce((sum, entry) => sum + entry.kb, 0);
  const ok = total <= budget;
  over ||= !ok;
  console.log(
    `budget: ${route}: ${total.toFixed(1)} KB gzip of ${String(budget)} KB (${String(files.length)} files) ${ok ? "OK" : "OVER"}`,
  );
  for (const { file, kb } of sizes.slice(0, 5)) {
    console.log(`  ${kb.toFixed(1).padStart(6)} KB  ${file}`);
  }
}

process.exit(over ? 1 : 0);
