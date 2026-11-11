import { z } from "zod";
import type { NextResult } from "@/lib/api/bff-types";
import { BffError } from "@/lib/bff/envelope";
import {
  callIdentity,
  dataResponse,
  passThrough,
  readData,
  readJsonBody,
} from "@/lib/bff/identity-public";
import { withBff } from "@/lib/bff/route";
import { isTokenResponse, startSession } from "@/lib/session/sign-in";
import { callFor } from "@/lib/session/upstream";

// POST /api/auth/invite/accept (TRD 5.4, 7.2; FE-9). Identity answers with a
// session in the invited tenant; the BFF writes it into cookies and answers
// where to go.
export const POST = withBff(
  async ({ request, requestId, cookies }) => {
    const body = await readJsonBody(
      request,
      z.strictObject({
        token: z.string().min(1).max(512),
        password: z.string().max(1024).optional(),
        display_name: z.string().max(100).optional(),
      }),
    );
    const response = await callIdentity(
      "/v1/auth/invite/accept",
      { method: "POST", body },
      callFor(request, requestId),
    );
    if (!response.ok) {
      return passThrough(response);
    }
    const data = await readData(response);
    if (!isTokenResponse(data)) {
      throw BffError.upstreamUnavailable();
    }
    const result: NextResult = {
      next: await startSession(data, "/", cookies),
    };
    return dataResponse(result);
  },
  { csrf: true, session: "none" },
);
