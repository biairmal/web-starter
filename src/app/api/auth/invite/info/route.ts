import { z } from "zod";
import {
  callIdentity,
  passThrough,
  readJsonBody,
} from "@/lib/bff/identity-public";
import { withBff } from "@/lib/bff/route";
import { callFor } from "@/lib/session/upstream";

// POST /api/auth/invite/info (TRD 6.3, 7.3; FE-9): what an invite is for.
// The token comes in the body, so it is never in a URL the BFF logs; only the
// call to identity carries it in the path, as identity's API defines.
export const POST = withBff(
  async ({ request, requestId }) => {
    const { token } = await readJsonBody(
      request,
      z.strictObject({ token: z.string().min(1).max(512) }),
    );
    return passThrough(
      await callIdentity(
        `/v1/auth/invite/${encodeURIComponent(token)}`,
        { method: "GET" },
        callFor(request, requestId),
      ),
    );
  },
  { csrf: true, session: "none" },
);
