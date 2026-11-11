import "server-only";

import type { NextRequest } from "next/server";
import { callIdentity } from "@/lib/bff/identity-public";
import { log, withBff } from "@/lib/bff/route";
import {
  applyCookies,
  clearedSessionCookies,
  readSessionCookies,
} from "@/lib/session/cookies";
import { callFor } from "@/lib/session/upstream";

/**
 * A sign-out route (TRD 5.4, 7.2): tells identity to revoke the refresh
 * token's family (`/v1/auth/logout`) or all of the user's families
 * (`/v1/auth/logout-all`), then clears every session cookie whatever identity
 * answered, or whether it answered at all. Always 204, so it is idempotent.
 */
export function signOutRoute(identityPath: string) {
  return withBff(
    async ({ request, requestId, cookies }) => {
      await revoke(request, requestId, identityPath);
      applyCookies(cookies, clearedSessionCookies());
      return new Response(null, { status: 204 });
    },
    { csrf: true, session: "none" },
  );
}

async function revoke(
  request: NextRequest,
  requestId: string,
  identityPath: string,
): Promise<void> {
  const { refresh } = await readSessionCookies(request.cookies);
  if (!refresh) {
    return;
  }
  try {
    const response = await callIdentity(
      identityPath,
      { method: "POST", body: { refresh_token: refresh.token } },
      callFor(request, requestId),
    );
    if (!response.ok) {
      log("warn", {
        msg: "sign-out refused upstream",
        request_id: requestId,
        status: response.status,
      });
    }
  } catch {
    log("warn", {
      msg: "sign-out upstream unavailable",
      request_id: requestId,
    });
  }
}
