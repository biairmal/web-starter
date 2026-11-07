import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { root, specPath } from "./api-schema.mts";

// Copies identity's OpenAPI file into openapi/identity.yaml and records where
// it came from. Source: IDENTITY_REPO_PATH, default ../go-identity (a checkout
// of go-identity, at a tag or at main).
const repo = resolve(root, process.env.IDENTITY_REPO_PATH ?? "../go-identity");
const from = join(repo, "api", "openapi.yaml");

if (!existsSync(from)) {
  console.error(
    `api:sync: ${from} not found. Set IDENTITY_REPO_PATH to a go-identity checkout.`,
  );
  process.exit(1);
}

function git(args: string[]): string | undefined {
  try {
    // safe.directory covers checkouts owned by another Windows account.
    return execFileSync(
      "git",
      ["-c", "safe.directory=*", "-C", repo, ...args],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
  } catch {
    return undefined;
  }
}

mkdirSync(dirname(specPath), { recursive: true });
copyFileSync(from, specPath);

const source = {
  file: "api/openapi.yaml",
  commit: git(["rev-parse", "HEAD"]) ?? "unknown",
  tag: git(["describe", "--tags", "--exact-match"]) ?? null,
};
writeFileSync(
  join(dirname(specPath), "identity.source.json"),
  `${JSON.stringify(source, null, 2)}\n`,
);

console.log(
  `api:sync: copied ${source.file} from ${repo} (${source.tag ?? source.commit}).`,
);
