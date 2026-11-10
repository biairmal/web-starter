import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/config/env";
import { BffError } from "@/lib/bff/envelope";
import { safeNext } from "@/lib/bff/next-path";
import { CookieJar, log } from "@/lib/bff/route";
import { newRequestId } from "@/lib/bff/request-id";
import { applyCookies, clearedSessionCookies } from "@/lib/session/cookies";
import { callFor, identityFetch } from "@/lib/session/identity-fetch";
import { SIGN_IN_PATH } from "@/lib/session/route-rules";
import { sessionFrom } from "@/lib/session/server";

// A Server Component found that identity rejects the session's access token,
// and it cannot set cookies. This route asks identity again with a refresh
// allowed: a session that still works goes back to `next` with new cookies;
// one that has ended is cleared and goes to sign-in with the reason. Calling
// it for a working session changes nothing, so it is safe as a GET.

function redirectTo(path: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, env.APP_URL), 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function signIn(reason: string, next: string): NextResponse {
  const response = redirectTo(
    `${SIGN_IN_PATH}?${new URLSearchParams({ reason, next }).toString()}`,
  );
  applyCookies(response.cookies, clearedSessionCookies());
  return response;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const requestId = newRequestId();
  const session = await sessionFrom(request.cookies);
  if (!session) {
    return signIn("SESSION_ENDED", next);
  }

  const jar = new CookieJar();
  try {
    const response = await identityFetch("/v1/me", { method: "GET" }, session, {
      call: callFor(request, requestId),
      cookies: jar,
    });
    if (response.ok) {
      const back = redirectTo(next);
      applyCookies(back.cookies, jar.specs);
      return back;
    }
    log("warn", {
      msg: "session check refused",
      request_id: requestId,
      status: response.status,
    });
    return signIn("SESSION_ENDED", next);
  } catch (error) {
    if (error instanceof BffError && error.reason === "SESSION_ENDED") {
      const cause = error.meta?.cause;
      return signIn(
        cause !== undefined && cause !== "NO_SESSION" ? cause : "SESSION_ENDED",
        next,
      );
    }
    return new NextResponse(
      "Service unavailable. Try again in a few seconds.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "Retry-After": "5",
        },
      },
    );
  }
}
