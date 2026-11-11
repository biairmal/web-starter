import { z } from "zod";
import type { NextResult } from "@/lib/api/bff-types";
import { BffError } from "@/lib/bff/envelope";
import {
  dataResponse,
  passThrough,
  readData,
  readJsonBody,
} from "@/lib/bff/identity-public";
import { withBff } from "@/lib/bff/route";
import { identityFetch } from "@/lib/session/identity-fetch";
import { isTokenResponse, startSession } from "@/lib/session/sign-in";
import { callFor } from "@/lib/session/upstream";

// POST /api/auth/switch-tenant (TRD 5.8, 7.2; FE-31). Identity answers with a
// new session for the chosen tenant: the BFF replaces both cookies with it and
// sends the browser to `/`, which it loads in full so nothing cached from the
// old tenant survives. Identity's errors (TENANT_SUSPENDED, NOT_A_MEMBER, 404
// in single mode) pass through unchanged.

const switchBody = z.strictObject({
  tenant_id: z.guid(),
});

const HOME_PATH = "/";

export const POST = withBff(
  async ({ request, requestId, session, cookies }) => {
    const input = await readJsonBody(request, switchBody);
    const response = await identityFetch(
      "/v1/auth/switch-tenant",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: input.tenant_id }),
      },
      session,
      { call: callFor(request, requestId), cookies },
    );
    if (!response.ok) {
      return passThrough(response);
    }
    const data = await readData(response);
    if (!isTokenResponse(data)) {
      throw BffError.upstreamUnavailable();
    }
    const result: NextResult = {
      next: await startSession(data, HOME_PATH, cookies),
    };
    return dataResponse(result);
  },
  { csrf: true, session: "required" },
);
