import { readFileSync } from "node:fs";
import { generateSchema, schemaPath } from "./api-schema.mts";

// Fails when the committed types do not match the committed spec.
const committed = readFileSync(schemaPath, "utf8");
const fresh = await generateSchema();

if (committed !== fresh) {
  console.error(
    "api:check: src/lib/api/schema.d.ts is out of date with openapi/identity.yaml.\n" +
      "Run `pnpm api:gen` and commit the result.",
  );
  process.exit(1);
}
console.log("api:check: generated types match openapi/identity.yaml.");
