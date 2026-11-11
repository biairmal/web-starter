import { z } from "zod";
import { forwardToIdentity } from "@/lib/bff/public-route";

// POST /api/auth/register (TRD 7.3, FE-4): identity answers 202 whether or
// not the address is taken, so the response never reveals an account.
export const POST = forwardToIdentity(
  "/v1/auth/register",
  z.strictObject({
    email: z.string().max(254),
    password: z.string().max(1024),
    display_name: z.string().max(100),
    tenant: z.string().min(1).max(100).optional(),
  }),
);
