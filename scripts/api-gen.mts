import { writeFileSync } from "node:fs";
import { relative } from "node:path";
import { generateSchema, listSpecs, root } from "./api-schema.mts";

for (const spec of listSpecs()) {
  writeFileSync(spec.schemaPath, await generateSchema(spec));
  console.log(`api:gen: wrote ${relative(root, spec.schemaPath)}`);
}
