import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { openapiDir, root } from "./api-schema.mts";

// Copies a business service's API description into openapi/<name>.json and
// records where it came from:
//
//   tsx scripts/api-sync-service.mts <name> <path to swagger.json or openapi.json>
//
// The path is relative to this repo. A Swagger 2.0 file (what swag generates
// for go-service-template) is converted to OpenAPI 3, which is what
// openapi-typescript reads. Run `pnpm api:gen` afterwards.

const [name, source] = process.argv.slice(2);

if (!name || !/^[a-z0-9-]+$/.test(name) || name === "identity" || !source) {
  console.error(
    "usage: tsx scripts/api-sync-service.mts <name> <spec file>\n" +
      "  <name>: lowercase letters, digits and hyphens (identity uses `pnpm api:sync`)",
  );
  process.exit(1);
}

const from = resolve(root, source);
if (!existsSync(from)) {
  console.error(`api:sync: ${from} not found.`);
  process.exit(1);
}

type Converter = {
  convertObj: (
    spec: unknown,
    options: { patch: boolean; warnOnly: boolean },
  ) => Promise<{ openapi: unknown }>;
};

function isConverter(value: unknown): value is Converter {
  return (
    typeof value === "object" &&
    value !== null &&
    "convertObj" in value &&
    typeof value.convertObj === "function"
  );
}

async function toOpenApi3(spec: unknown): Promise<unknown> {
  const isSwagger2 =
    typeof spec === "object" &&
    spec !== null &&
    "swagger" in spec &&
    spec.swagger === "2.0";
  if (!isSwagger2) {
    return spec;
  }
  // swagger2openapi is CommonJS without type definitions.
  const converter: unknown = createRequire(import.meta.url)("swagger2openapi");
  if (!isConverter(converter)) {
    throw new Error("swagger2openapi has no convertObj()");
  }
  const { openapi } = await converter.convertObj(spec, {
    patch: true,
    warnOnly: true,
  });
  return openapi;
}

function git(args: string[]): string | undefined {
  try {
    return execFileSync(
      "git",
      ["-c", "safe.directory=*", "-C", dirname(from), ...args],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
  } catch {
    return undefined;
  }
}

const spec: unknown = JSON.parse(readFileSync(from, "utf8"));
const target = join(openapiDir, `${name}.json`);
mkdirSync(openapiDir, { recursive: true });
writeFileSync(target, `${JSON.stringify(await toOpenApi3(spec), null, 2)}\n`);

const topLevel = git(["rev-parse", "--show-toplevel"]);
const record = {
  file: topLevel
    ? from.slice(resolve(topLevel).length + 1).replaceAll("\\", "/")
    : source,
  commit: git(["rev-parse", "HEAD"]) ?? "unknown",
  tag: git(["describe", "--tags", "--exact-match"]) ?? null,
};
writeFileSync(
  join(openapiDir, `${name}.source.json`),
  `${JSON.stringify(record, null, 2)}\n`,
);

console.log(
  `api:sync: wrote openapi/${name}.json from ${record.file} (${record.tag ?? record.commit}).`,
);
