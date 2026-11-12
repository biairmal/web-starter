import { existsSync, readFileSync } from "node:fs";
import { relative } from "node:path";
import { generateSchema, listSpecs, root } from "./api-schema.mts";

// Fails when the committed types do not match the committed specs.
let stale = 0;
for (const spec of listSpecs()) {
  const target = relative(root, spec.schemaPath);
  const committed = existsSync(spec.schemaPath)
    ? readFileSync(spec.schemaPath, "utf8")
    : undefined;
  if (committed !== (await generateSchema(spec))) {
    console.error(`api:check: ${target} is out of date with ${spec.file}.`);
    stale += 1;
  }
}

if (stale > 0) {
  console.error("Run `pnpm api:gen` and commit the result.");
  process.exit(1);
}
console.log("api:check: generated types match every spec in openapi/.");
