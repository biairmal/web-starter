import { z } from "zod";
import { forwardToIdentity } from "@/lib/bff/public-route";

// POST /api/auth/email/verify (TRD 7.3, FE-5): the token comes in the body,
// read from the link's fragment, so it never appears in a URL the BFF logs.
export const POST = forwardToIdentity(
  "/v1/auth/email/verify",
  z.strictObject({ token: z.string().min(1).max(512) }),
);
