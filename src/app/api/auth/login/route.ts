import { z } from "zod";
import type { LoginResult } from "@/lib/api/bff-types";
import { BffError } from "@/lib/bff/envelope";
import {
  callIdentity,
  dataResponse,
  passThrough,
  readData,
  readJsonBody,
} from "@/lib/bff/identity-public";
import { safeNext } from "@/lib/bff/next-path";
import { withBff } from "@/lib/bff/route";
import {
  isTenantChoice,
  isTokenResponse,
  startSession,
} from "@/lib/session/sign-in";
import { callFor } from "@/lib/session/upstream";

// POST /api/auth/login (TRD 5.4, 7.2). Tokens go into cookies and never into
// the response: the browser gets where to go next, or the tenants to choose
// from (FE-8). Identity's errors pass through unchanged.

const loginBody = z.object({
  email: z.string().max(254),
  password: z.string().max(1024),
  tenant: z.string().min(1).max(100).optional(),
  next: z.string().optional(),
});

export const POST = withBff(
  async ({ request, requestId, cookies }) => {
    const input = await readJsonBody(request, loginBody);
    const next = safeNext(input.next);
    const upstream = await callIdentity(
      "/v1/auth/login",
      {
        method: "POST",
        body: {
          email: input.email,
          password: input.password,
          ...(input.tenant === undefined ? {} : { tenant: input.tenant }),
        },
      },
      callFor(request, requestId),
    );
    if (!upstream.ok) {
      return passThrough(upstream);
    }

    const data = await readData(upstream);
    if (isTenantChoice(data)) {
      const result: LoginResult = {
        tenant_required: true,
        tenants: data.tenants,
      };
      return dataResponse(result);
    }
    if (!isTokenResponse(data)) {
      throw BffError.upstreamUnavailable();
    }
    const result: LoginResult = {
      next: await startSession(data, next, cookies),
    };
    return dataResponse(result);
  },
  { csrf: true, session: "none" },
);
