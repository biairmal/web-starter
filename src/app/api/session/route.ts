import { NextResponse } from "next/server";
import { withBff } from "@/lib/bff/route";
import { readSessionCookies } from "@/lib/session/cookies";

// GET /api/session (TRD 7.2): whether this browser still has a session, from
// the cookies alone. Other tabs ask after a BroadcastChannel message (5.6).
// It never returns a token or a claim beyond the expiry.
export const GET = withBff(
  async ({ request }) => {
    const { access, refresh, restricted } = await readSessionCookies(
      request.cookies,
    );
    const now = Math.floor(Date.now() / 1000);
    const signedIn = refresh !== null && refresh.refreshExpiresAt > now;
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      data: {
        signed_in: signedIn,
        expires_at: signedIn && access ? access.exp : null,
        restricted: !signedIn && restricted !== null,
      },
    });
  },
  { csrf: false, session: "none" },
);
