import { z } from "zod";
import { forwardToIdentity } from "@/lib/bff/public-route";

// POST /api/auth/password/forgot (TRD 7.3, FE-6): identity answers 202
// whether or not the address has an account.
export const POST = forwardToIdentity(
  "/v1/auth/password/forgot",
  z.strictObject({ email: z.string().max(254) }),
);
