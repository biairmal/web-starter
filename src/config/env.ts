import "server-only";

import { parseEnv } from "@/config/env-schema";

// Validated once, when the server starts (see src/instrumentation.ts). A bad or
// missing variable stops the process with a message that names it.
export const env = parseEnv(process.env);

export type { Env } from "@/config/env-schema";
