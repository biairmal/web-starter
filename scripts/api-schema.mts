import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

export const root = resolve(import.meta.dirname, "..");
export const openapiDir = resolve(root, "openapi");
export const specPath = resolve(openapiDir, "identity.yaml");
export const schemaPath = resolve(root, "src", "lib", "api", "schema.d.ts");

/** One OpenAPI file and the types generated from it. */
export type Spec = {
  /** The service name: the file name without its extension. */
  name: string;
  file: string;
  specPath: string;
  schemaPath: string;
};

const SPEC_FILE = /^([a-z0-9-]+)\.(yaml|json)$/;

/**
 * Every spec in openapi/: identity.yaml generates src/lib/api/schema.d.ts,
 * and a business service's openapi/<name>.json generates
 * src/lib/api/<name>-schema.d.ts. `<name>.source.json` files record where a
 * spec came from and are not specs.
 */
export function listSpecs(): Spec[] {
  return readdirSync(openapiDir)
    .flatMap((file) => {
      const match = SPEC_FILE.exec(file);
      const name = match?.[1];
      if (!name) {
        return [];
      }
      return [
        {
          name,
          file: `openapi/${file}`,
          specPath: resolve(openapiDir, file),
          schemaPath:
            name === "identity"
              ? schemaPath
              : resolve(root, "src", "lib", "api", `${name}-schema.d.ts`),
        },
      ];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function header(spec: Spec): string {
  return [
    `// Generated from ${spec.file} by \`pnpm api:gen\`. Do not edit by hand.`,
    "// Regenerate after the spec changes; `pnpm api:check` fails when this file is stale.",
    "",
  ].join("\n");
}

/** The TypeScript source that openapi-typescript produces for a pinned spec. */
export async function generateSchema(spec: Spec): Promise<string> {
  const ast = await openapiTS(pathToFileURL(spec.specPath));
  return header(spec) + astToString(ast);
}
