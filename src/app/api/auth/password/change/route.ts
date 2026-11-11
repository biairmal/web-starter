import { z } from "zod";
import type { NextResult } from "@/lib/api/bff-types";
import { BffError, reasonOf } from "@/lib/bff/envelope";
import {
  callIdentity,
  dataResponse,
  passThrough,
  readData,
  readJsonBody,
} from "@/lib/bff/identity-public";
import { safeNext } from "@/lib/bff/next-path";
import { withBff } from "@/lib/bff/route";
import { readSessionCookies } from "@/lib/session/cookies";
import { identityFetch } from "@/lib/session/identity-fetch";
import { sessionFrom } from "@/lib/session/server";
import { isTokenResponse, startSession } from "@/lib/session/sign-in";
import { callFor } from "@/lib/session/upstream";

// POST /api/auth/password/change (TRD 5.7, 7.2; FE-7, FE-32). Calls
// `POST /v1/me/password` with the restricted token of a forced change, or
// with the session of a signed-in user. Identity answers with a new session
// (every other one is revoked): the BFF writes it, drops the restricted
// cookie, and answers where to go next.

const changeBody = z.strictObject({
  current_password: z.string().max(1024).optional(),
  new_password: z.string().max(1024),
  next: z.string().optional(),
});

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export const POST = withBff(
  async ({ request, requestId, cookies }) => {
    const input = await readJsonBody(request, changeBody);
    const body = {
      new_password: input.new_password,
      ...(input.current_password === undefined
        ? {}
        : { current_password: input.current_password }),
    };
    const call = callFor(request, requestId);

    let response: Response;
    let next: string;
    const session = await sessionFrom(request.cookies);
    if (session) {
      // A wrong current password is a 401 with a reason; identityFetch
      // passes it through without ending the session (TRD decision 13).
      response = await identityFetch(
        "/v1/me/password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        session,
        { call, cookies },
      );
      next = safeNext(input.next);
    } else {
      const { restricted } = await readSessionCookies(request.cookies);
      if (!restricted || restricted.exp <= nowSeconds()) {
        throw BffError.sessionEnded("NO_SESSION");
      }
      response = await callIdentity(
        "/v1/me/password",
        { method: "POST", body, bearer: restricted.token },
        call,
      );
      next = safeNext(restricted.next);
      if (response.status === 401) {
        const text = await response.clone().text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = undefined;
        }
        if (reasonOf(parsed) === undefined) {
          // The restricted token expired or was revoked: sign in again.
          throw BffError.sessionEnded("NO_SESSION");
        }
      }
    }

    if (!response.ok) {
      return passThrough(response);
    }
    const data = await readData(response);
    if (!isTokenResponse(data)) {
      throw BffError.upstreamUnavailable();
    }
    const result: NextResult = {
      next: await startSession(data, next, cookies),
    };
    return dataResponse(result);
  },
  { csrf: true, session: "none" },
);
