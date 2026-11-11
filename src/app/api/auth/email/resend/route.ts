import { z } from "zod";
import { forwardToIdentity } from "@/lib/bff/public-route";

// POST /api/auth/email/resend (TRD 7.3, FE-4): always 202 for a well-formed
// body, whatever the address.
export const POST = forwardToIdentity(
  "/v1/auth/email/resend",
  z.strictObject({ email: z.string().max(254) }),
);
