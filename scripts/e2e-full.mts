import { execFileSync, spawnSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

// Runs the full e2e suite (TRD 13; plan F7.1) against a real identity:
//
//   pnpm e2e:full                      # single mode, then multi mode
//   E2E_TENANCY=multi pnpm e2e:full    # one mode only
//   pnpm e2e:full -- --grep FE-21      # extra arguments go to Playwright
//
// Environment:
//   IDENTITY_IMAGE   identity image (default ghcr.io/biairmal/go-identity:latest)
//   IDENTITY_BUILD=1 build it first from IDENTITY_REPO_PATH (default ../go-identity)
//   E2E_KEEP=1       leave the stack running afterwards (`pnpm e2e:full:run` reuses it)
//
// Each mode starts deploy/compose.e2e.yaml from an empty database, so a run
// never depends on the one before it.

const root = resolve(import.meta.dirname, "..");
const composeFile = join(root, "deploy", "compose.e2e.yaml");
const generated = join(root, "deploy", "e2e", ".generated");
const project = "ws-e2e";
const baseUrl = "http://localhost:3000";

/** Short enough that sessions refresh during the run (see docs/DECISIONS.md). */
const ACCESS_TTL = "90s";

const playwrightArgs = process.argv.slice(2).filter((arg) => arg !== "--");
const modes = process.env.E2E_TENANCY
  ? [process.env.E2E_TENANCY]
  : ["single", "multi"];

let identityImage =
  process.env.IDENTITY_IMAGE ?? "ghcr.io/biairmal/go-identity:latest";

function run(
  command: string,
  args: string[],
  env: Record<string, string> = {},
) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
    shell: process.platform === "win32" && command === "pnpm",
  });
  return result.status ?? 1;
}

function compose(args: string[], env: Record<string, string> = {}): number {
  return run("docker", ["compose", "-f", composeFile, "-p", project, ...args], {
    IDENTITY_IMAGE: identityImage,
    ...env,
  });
}

function buildIdentity(): void {
  const repo = resolve(
    root,
    process.env.IDENTITY_REPO_PATH ?? "../go-identity",
  );
  identityImage = "go-identity:e2e";
  console.log(`e2e:full: building ${identityImage} from ${repo}`);
  if (run("docker", ["build", "-t", identityImage, repo]) !== 0) {
    process.exit(1);
  }
}

/** One RSA signing key in the layout identity reads (keys.yaml + <kid>.pem). */
function writeKeys(): void {
  const dir = join(generated, "keys");
  mkdirSync(dir, { recursive: true });
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  // Readable by the image's non-root user; test-only keys.
  writeFileSync(
    join(dir, "e2e.pem"),
    privateKey.export({ type: "pkcs8", format: "pem" }),
    { mode: 0o644 },
  );
  writeFileSync(
    join(dir, "keys.yaml"),
    "active: e2e\nnext: []\nretiring: []\n",
    { mode: 0o644 },
  );
}

/**
 * identity's own config/config.yaml, taken from the image so it always
 * matches it, with a short access token and rate limits a test run fits in
 * (every test signs in from the same address).
 */
function writeIdentityConfig(): void {
  const container = execFileSync("docker", ["create", identityImage], {
    encoding: "utf8",
  }).trim();
  const target = join(generated, "identity-config.yaml");
  try {
    execFileSync("docker", [
      "cp",
      `${container}:/app/config/config.yaml`,
      target,
    ]);
  } finally {
    execFileSync("docker", ["rm", container]);
  }
  const patches: [RegExp, string][] = [
    [/^(\s*access_ttl:\s*)\S+/m, `$1${ACCESS_TTL}`],
    [/^(\s*login_rate_limit:\s*)\S+/m, "$11000/5m"],
    [/^(\s*refresh_rate_limit:\s*)\S+/m, "$110000/5m"],
  ];
  let config = readFileSync(target, "utf8");
  for (const [pattern, replacement] of patches) {
    if (!pattern.test(config)) {
      throw new Error(
        `e2e:full: identity config has no line for ${String(pattern)}`,
      );
    }
    config = config.replace(pattern, replacement);
  }
  writeFileSync(target, config, { mode: 0o644 });
}

async function waitFor(url: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok) {
        return true;
      }
    } catch {
      // not up yet
    }
    await new Promise((done) => setTimeout(done, 1000));
  }
  return false;
}

if (process.env.IDENTITY_BUILD === "1") {
  buildIdentity();
}
if (run("docker", ["image", "inspect", identityImage]) !== 0) {
  if (run("docker", ["pull", identityImage]) !== 0) {
    console.error(`e2e:full: no identity image ${identityImage}.`);
    process.exit(1);
  }
}

rmSync(generated, { recursive: true, force: true });
mkdirSync(generated, { recursive: true });
writeKeys();
writeIdentityConfig();

let failed = false;
for (const [index, mode] of modes.entries()) {
  console.log(`\ne2e:full: ${mode} mode`);
  compose(["down", "-v", "--remove-orphans"]);
  const up = compose(
    ["up", "-d", ...(index === 0 ? ["--build"] : []), "--remove-orphans"],
    { TENANCY_MODE: mode },
  );
  const ready =
    up === 0 &&
    (await waitFor(`${baseUrl}/api/readyz`, 180_000)) &&
    (await waitFor("http://localhost:9090/healthz", 30_000));
  if (!ready) {
    console.error(`e2e:full: the ${mode} stack did not become ready.`);
    compose(["ps", "-a"]);
    compose(["logs", "--tail", "50"]);
    failed = true;
  } else {
    const status = run(
      "pnpm",
      ["exec", "playwright", "test", "--project=full", ...playwrightArgs],
      {
        E2E_BASE_URL: baseUrl,
        E2E_TENANCY: mode,
        E2E_COMPOSE_FILE: composeFile,
        E2E_COMPOSE_PROJECT: project,
      },
    );
    failed ||= status !== 0;
  }
  if (process.env.E2E_KEEP !== "1" || index < modes.length - 1) {
    compose(["down", "-v", "--remove-orphans"]);
  }
}

process.exit(failed ? 1 : 0);
