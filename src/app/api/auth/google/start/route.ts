import { env } from "@/config/env";
import { safeNext } from "@/lib/bff/next-path";
import { withBff } from "@/lib/bff/route";
import { sealNextCookie } from "@/lib/session/next-cookie";
import { cleanTenantSlug } from "@/lib/tenant-slug";

// GET /api/auth/google/start (TRD 5.5, 7.2; FE-3). The "Continue with Google"
// link lands here: the return path (and tenant slug, in multi mode) goes into
// a short-lived sealed cookie, then the browser goes to identity, which goes
// to Google and comes back to /auth/callback.

const CALLBACK_PATH = "/auth/callback";

export const GET = withBff(
  async ({ request, cookies }) => {
    const params = request.nextUrl.searchParams;
    const next = safeNext(params.get("next"));
    const tenant = cleanTenantSlug(params.get("tenant"));

    const saved = await sealNextCookie({
      path: next,
      ...(tenant === undefined ? {} : { tenant }),
    });
    cookies.set(saved.name, saved.value, saved.options);

    const target = new URL(
      `${env.IDENTITY_PUBLIC_URL.replace(/\/$/, "")}/v1/auth/google/start`,
    );
    target.searchParams.set(
      "redirect_to",
      new URL(CALLBACK_PATH, env.APP_URL).toString(),
    );
    if (tenant !== undefined) {
      target.searchParams.set("tenant", tenant);
    }
    return new Response(null, {
      status: 302,
      headers: { Location: target.toString() },
    });
  },
  { csrf: false, session: "none" },
);
