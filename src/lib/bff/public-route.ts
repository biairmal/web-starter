import "server-only";

import type { z } from "zod";
import {
  callIdentity,
  passThrough,
  readJsonBody,
} from "@/lib/bff/identity-public";
import { withBff } from "@/lib/bff/route";
import { callFor } from "@/lib/session/upstream";

/**
 * A public pass-through route (TRD 7.3): checks CSRF, validates the JSON body
 * against `schema`, posts exactly that to identity at `path`, and returns
 * identity's answer unchanged. No session cookie is read or sent.
 */
export function forwardToIdentity(path: string, schema: z.ZodType) {
  return withBff(
    async ({ request, requestId }) => {
      const body = await readJsonBody(request, schema);
      return passThrough(
        await callIdentity(
          path,
          { method: "POST", body },
          callFor(request, requestId),
        ),
      );
    },
    { csrf: true, session: "none" },
  );
}
