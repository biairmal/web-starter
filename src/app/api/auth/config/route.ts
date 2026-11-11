import { BffError } from "@/lib/bff/envelope";
import { dataResponse } from "@/lib/bff/identity-public";
import { withBff } from "@/lib/bff/route";
import { getAuthConfig } from "@/lib/session/me";

// GET /api/auth/config (TRD 7.3): what the sign-in and sign-up screens show.
// Served from the BFF's cached copy of identity's answer.
export const GET = withBff(
  async () => {
    const config = await getAuthConfig();
    if (!config) {
      throw BffError.upstreamUnavailable();
    }
    return dataResponse(config);
  },
  { csrf: false, session: "none" },
);
