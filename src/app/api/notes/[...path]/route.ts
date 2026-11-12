import { env } from "@/config/env";
import { BffError } from "@/lib/bff/envelope";
import { createServiceProxy } from "@/lib/bff/proxy";

// The example notes service (go-service-template): /api/notes/<path> goes to
// NOTES_INTERNAL_URL/v1/<path> with the session's bearer token, when the
// allow-list permits it (TRD 7.4, FE-62). docs/adding-a-module.md.

export const { GET, POST, PUT, PATCH, DELETE } = createServiceProxy({
  prefix: "/v1",
  baseUrl: () => {
    if (!env.NOTES_INTERNAL_URL) {
      throw BffError.upstreamUnavailable();
    }
    return env.NOTES_INTERNAL_URL;
  },
  allow: { allow: ["notes", "notes/**"] },
});
