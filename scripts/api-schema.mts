import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

export const root = resolve(import.meta.dirname, "..");
export const specPath = resolve(root, "openapi", "identity.yaml");
export const schemaPath = resolve(root, "src", "lib", "api", "schema.d.ts");

const header = [
  "// Generated from openapi/identity.yaml by `pnpm api:gen`. Do not edit by hand.",
  "// Regenerate after the spec changes; `pnpm api:check` fails when this file is stale.",
  "",
].join("\n");

/** The TypeScript source that openapi-typescript produces for the pinned spec. */
export async function generateSchema(): Promise<string> {
  const ast = await openapiTS(pathToFileURL(specPath));
  return header + astToString(ast);
}
