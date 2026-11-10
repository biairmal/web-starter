import type { NextRequest } from "next/server";
import { env } from "@/config/env";
import {
  NONCE_HEADER,
  contentSecurityPolicy,
  createNonce,
} from "@/lib/security/csp";
import { guardRequest } from "@/lib/session/guard";
import { REQUEST_PATH_HEADER } from "@/lib/session/route-rules";

// Session check, single-flight refresh and route guards (TRD 5.3, 6.2), and
// the per-request Content Security Policy (TRD 11.2). Runs on the Node
// runtime so it shares the in-process refresh lock with route handlers.

export default async function middleware(request: NextRequest) {
  const nonce = createNonce();
  const csp = contentSecurityPolicy({
    nonce,
    identityPublicUrl: env.IDENTITY_PUBLIC_URL,
    development: process.env.NODE_ENV === "development",
  });
  // Set on the request before the guard forwards it: the layout reads the
  // nonce, and Next.js reads the policy to put the nonce on its own scripts.
  // Any value the browser sent for these headers is overwritten.
  request.headers.set(NONCE_HEADER, nonce);
  request.headers.set("Content-Security-Policy", csp);
  request.headers.set(
    REQUEST_PATH_HEADER,
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  const response = await guardRequest(request);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  runtime: "nodejs",
  // Everything except build assets and files with an extension (fonts,
  // brand images, favicon).
  matcher: ["/((?!_next/static|_next/image|.*\\.[A-Za-z0-9]+$).*)"],
};
