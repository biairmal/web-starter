import { env } from "@/config/env";
import { BffError, reasonOf } from "@/lib/bff/envelope";
import { withBff } from "@/lib/bff/route";
import { applyCookies, clearedSessionCookies } from "@/lib/session/cookies";
import { identityFetch } from "@/lib/session/identity-fetch";
import { sealNextCookie } from "@/lib/session/next-cookie";
import { SIGN_IN_PATH } from "@/lib/session/route-rules";
import { callFor } from "@/lib/session/upstream";

// GET /api/auth/google/link (TRD 5.5, 7.2; FE-33; APP_FLOW 5.16). The "Link
// Google" button on the security page is a plain link to here. The BFF asks
// identity, with the user's bearer token, where to send the browser, and
// redirects it there: Google, then identity, then /auth/callback?linked=1.
// Every outcome is a redirect, because the browser navigated here.

const CALLBACK_PATH = "/auth/callback";
const SECURITY_PATH = "/account/security";

function redirect(location: string, status = 303): Response {
  return new Response(null, { status, headers: { Location: location } });
}

function toApp(path: string): Response {
  return redirect(new URL(path, env.APP_URL).toString());
}

/** Back to the security page with the reason the link could not start. */
function failed(reason: string): Response {
  return toApp(
    `${SECURITY_PATH}?${new URLSearchParams({ error: reason }).toString()}`,
  );
}

function toSignIn(reason: string): Response {
  return toApp(
    `${SIGN_IN_PATH}?${new URLSearchParams({ reason, next: SECURITY_PATH }).toString()}`,
  );
}

/** Only an absolute http(s) URL from identity is followed. */
function externalUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

async function reasonOfResponse(response: Response): Promise<string> {
  try {
    return reasonOf(await response.json()) ?? "UPSTREAM_UNAVAILABLE";
  } catch {
    return "UPSTREAM_UNAVAILABLE";
  }
}

export const GET = withBff(
  async ({ request, requestId, session, cookies }) => {
    if (!session) {
      return toSignIn("SESSION_ENDED");
    }
    const query = new URLSearchParams({
      redirect_to: new URL(CALLBACK_PATH, env.APP_URL).toString(),
    });
    let response: Response;
    try {
      response = await identityFetch(
        `/v1/auth/google/link/start?${query.toString()}`,
        { method: "GET", headers: { Accept: "application/json" } },
        session,
        { call: callFor(request, requestId), cookies },
      );
    } catch (error) {
      if (error instanceof BffError && error.reason === "SESSION_ENDED") {
        applyCookies(cookies, clearedSessionCookies());
        const cause = error.meta?.cause;
        return toSignIn(
          cause === undefined || cause === "NO_SESSION"
            ? "SESSION_ENDED"
            : cause,
        );
      }
      if (error instanceof BffError) {
        return failed("UPSTREAM_UNAVAILABLE");
      }
      throw error;
    }

    const location = externalUrl(response.headers.get("location"));
    if (response.status >= 300 && response.status < 400 && location) {
      // A Google error on the way back returns to this page, not sign-in.
      const saved = await sealNextCookie({ path: SECURITY_PATH, link: true });
      cookies.set(saved.name, saved.value, saved.options);
      return redirect(location, 302);
    }
    return failed(
      response.status >= 500
        ? "UPSTREAM_UNAVAILABLE"
        : await reasonOfResponse(response),
    );
  },
  { csrf: false, session: "optional" },
);

// Never cached: every call starts a new link for the signed-in user.
export const dynamic = "force-dynamic";
