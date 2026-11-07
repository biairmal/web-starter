import { writeFileSync } from "node:fs";
import { generateSchema, schemaPath } from "./api-schema.mts";

writeFileSync(schemaPath, await generateSchema());
console.log(`api:gen: wrote ${schemaPath}`);
