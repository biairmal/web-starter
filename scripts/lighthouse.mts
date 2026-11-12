import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Lighthouse on /sign-in against the PRD targets (PRD 3, FE-NFR-3):
// performance >= 90 and LCP < 2.5 s, simulated mobile. Measures over HTTPS and
// HTTP/2, as production serves the app, through the e2e stack's TLS site
// (deploy/e2e/Caddyfile). Three runs; the median of each metric must pass.
//
//   E2E_KEEP=1 pnpm e2e:full     # leaves the stack running
//   pnpm lighthouse              # LIGHTHOUSE_URL overrides the address

const url = process.env.LIGHTHOUSE_URL ?? "https://localhost:3443/sign-in";
const RUNS = 3;
const MIN_SCORE = 90;
const MAX_LCP_MS = 2500;

type Report = {
  categories: { performance: { score: number } };
  audits: Record<string, { numericValue?: number }>;
};

const dir = mkdtempSync(join(tmpdir(), "lighthouse-"));
const scores: number[] = [];
const lcps: number[] = [];
try {
  for (let run = 1; run <= RUNS; run++) {
    const output = join(dir, `run-${String(run)}.json`);
    const result = spawnSync(
      "npx",
      [
        "-y",
        "lighthouse@12.8.2",
        url,
        "--only-categories=performance",
        // Caddy's local CA is not in the browser's trust store. Quoted, as
        // the Windows shell would split the flags at the space.
        `--chrome-flags="--headless=new --ignore-certificate-errors"`,
        "--output=json",
        `--output-path=${output}`,
        "--quiet",
      ],
      { stdio: "inherit", shell: process.platform === "win32" },
    );
    if (result.status !== 0) {
      console.error(`lighthouse: run ${String(run)} failed.`);
      process.exit(1);
    }
    const report = JSON.parse(readFileSync(output, "utf8")) as Report;
    const score = Math.round(report.categories.performance.score * 100);
    const lcp = report.audits["largest-contentful-paint"]?.numericValue ?? NaN;
    scores.push(score);
    lcps.push(lcp);
    console.log(
      `lighthouse: run ${String(run)}: performance ${String(score)}, LCP ${(lcp / 1000).toFixed(1)} s`,
    );
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? NaN;
const score = median(scores);
const lcp = median(lcps);
const ok = score >= MIN_SCORE && lcp < MAX_LCP_MS;
console.log(
  `lighthouse: ${url}: median performance ${String(score)} (>= ${String(MIN_SCORE)}), LCP ${(lcp / 1000).toFixed(1)} s (< ${String(MAX_LCP_MS / 1000)} s) ${ok ? "OK" : "FAIL"}`,
);
process.exit(ok ? 0 : 1);
