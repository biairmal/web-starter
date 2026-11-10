import { env } from "@/config/env";
import { identityAllowList } from "@/lib/bff/allowlist";
import { createServiceProxy } from "@/lib/bff/proxy";

// Authenticated identity calls from the browser: /api/id/<path> goes to
// IDENTITY_INTERNAL_URL/v1/<path> when the allow-list permits it (TRD 7.4).

export const { GET, POST, PUT, PATCH, DELETE } = createServiceProxy({
  prefix: "/v1",
  baseUrl: () => env.IDENTITY_INTERNAL_URL,
  allow: identityAllowList,
});
