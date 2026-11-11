import { env } from "@/config/env";
import { BffError, reasonOf } from "@/lib/bff/envelope";
import { callIdentity, readData } from "@/lib/bff/identity-public";
import { type CookieJar, log, withBff } from "@/lib/bff/route";
import {
  type NextCookie,
  clearedNextCookie,
  readNextCookie,
} from "@/lib/session/next-cookie";
import { SIGN_IN_PATH } from "@/lib/session/route-rules";
import { isTokenResponse, startSession } from "@/lib/session/sign-in";
import { callFor } from "@/lib/session/upstream";

// GET /auth/callback (TRD 5.5, 7.2; FE-3; APP_FLOW 5.3). Identity sends the
// browser here after Google with `code` (a one-time exchange code), `error`
// (a reason) or `linked=1`. A code is exchanged server-side for tokens, which
// go into cookies; the page never renders the code. Every outcome is a
// redirect.

/** Where a linked Google account returns to (account security, FE-33). */
const SECURITY_PATH = "/account/security";
const LINKED_PATH = `${SECURITY_PATH}?linked=1`;

/** Reasons are upper-case identifiers; anything else in `error` is replaced. */
const REASON_PATTERN = /^[A-Z][A-Z_]{0,63}$/;
const FALLBACK_REASON = "OAUTH_STATE_INVALID";

function redirect(path: string): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: new URL(path, env.APP_URL).toString() },
  });
}

function toSignIn(reason: string, saved: NextCookie | null): Response {
  const params = new URLSearchParams({
    reason: REASON_PATTERN.test(reason) ? reason : FALLBACK_REASON,
  });
  if (saved && saved.path !== "/") {
    params.set("next", saved.path);
  }
  if (saved?.tenant && reason === "TENANT_REQUIRED") {
    params.set("tenant", saved.tenant);
  }
  return redirect(`${SIGN_IN_PATH}?${params.toString()}`);
}

/** A failed Google link returns to the security page with the reason. */
function toSecurity(reason: string): Response {
  const params = new URLSearchParams({
    error: REASON_PATTERN.test(reason) ? reason : FALLBACK_REASON,
  });
  return redirect(`${SECURITY_PATH}?${params.toString()}`);
}

async function exchange(
  code: string,
  saved: NextCookie | null,
  request: Request,
  requestId: string,
  cookies: CookieJar,
): Promise<Response> {
  let response: Response;
  try {
    response = await callIdentity(
      "/v1/auth/exchange",
      { method: "POST", body: { code } },
      callFor(request, requestId),
    );
  } catch (error) {
    if (error instanceof BffError) {
      return toSignIn("UPSTREAM_UNAVAILABLE", saved);
    }
    throw error;
  }
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    log("warn", {
      msg: "google exchange refused",
      request_id: requestId,
      status: response.status,
    });
    const reason = reasonOf(body);
    return toSignIn(
      response.status >= 500
        ? "UPSTREAM_UNAVAILABLE"
        : // A used or expired code is TOKEN_INVALID, whose copy is about
          // email links; on sign-in it reads as Google not completing.
          reason === undefined || reason === "TOKEN_INVALID"
          ? FALLBACK_REASON
          : reason,
      saved,
    );
  }
  const data = await readData(response);
  if (!isTokenResponse(data)) {
    return toSignIn("UPSTREAM_UNAVAILABLE", saved);
  }
  return redirect(await startSession(data, saved?.path ?? "/", cookies));
}

export const GET = withBff(
  async ({ request, requestId, cookies }) => {
    const params = request.nextUrl.searchParams;
    const saved = await readNextCookie(request.cookies);
    const done = clearedNextCookie();
    cookies.set(done.name, done.value, done.options);

    if (params.get("linked") === "1") {
      return redirect(LINKED_PATH);
    }
    const error = params.get("error");
    if (error) {
      return saved?.link ? toSecurity(error) : toSignIn(error, saved);
    }
    const code = params.get("code");
    if (!code) {
      return toSignIn(FALLBACK_REASON, saved);
    }
    return exchange(code, saved, request, requestId, cookies);
  },
  { csrf: false, session: "none" },
);

// Never cached, never prerendered: every call carries a one-time code.
export const dynamic = "force-dynamic";
