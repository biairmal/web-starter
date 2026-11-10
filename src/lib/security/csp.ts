import "server-only";

import { randomBytes } from "node:crypto";

// Content Security Policy with a per-request nonce (TRD 11.2). Middleware sets
// it on every response; the root layout puts the nonce on its inline script,
// and Next.js adds it to its own scripts.

/** Request header that carries the nonce from middleware to the layout. */
export const NONCE_HEADER = "x-nonce";

export function createNonce(): string {
  return randomBytes(16).toString("base64");
}

export type CspOptions = {
  nonce: string;
  /** Identity's public origin: Google sign-in posts and redirects there. */
  identityPublicUrl: string;
  /** React and Turbopack in `next dev` evaluate code with `eval`. */
  development: boolean;
};

export function contentSecurityPolicy(options: CspOptions): string {
  const scripts = [
    "'self'",
    `'nonce-${options.nonce}'`,
    "'strict-dynamic'",
    ...(options.development ? ["'unsafe-eval'"] : []),
  ];
  const directives = [
    "default-src 'self'",
    `script-src ${scripts.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    `form-action 'self' ${new URL(options.identityPublicUrl).origin}`,
    "base-uri 'self'",
  ];
  return directives.join("; ");
}
