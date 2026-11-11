import { z } from "zod";
import {
  callIdentity,
  passThrough,
  readJsonBody,
} from "@/lib/bff/identity-public";
import { withBff } from "@/lib/bff/route";
import { applyCookies, clearedSessionCookies } from "@/lib/session/cookies";
import { callFor } from "@/lib/session/upstream";

// POST /api/auth/password/reset (TRD 7.3, FE-6; APP_FLOW 5.5). A reset
// revokes every session of the user (BE FLOW 8), so on success this browser's
// session cookies are cleared too: they could only fail at the next refresh.
export const POST = withBff(
  async ({ request, requestId, cookies }) => {
    const body = await readJsonBody(
      request,
      z.strictObject({
        token: z.string().min(1).max(512),
        password: z.string().max(1024),
      }),
    );
    const response = await callIdentity(
      "/v1/auth/password/reset",
      { method: "POST", body },
      callFor(request, requestId),
    );
    if (response.ok) {
      applyCookies(cookies, clearedSessionCookies());
    }
    return passThrough(response);
  },
  { csrf: true, session: "none" },
);
