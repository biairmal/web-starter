import "server-only";

// Route access rules as data (TRD 6.1, 5.7). Paths match exactly; a trailing
// slash is ignored.

/** Pages anyone may open. */
export const PUBLIC_PAGES = [
  "/sign-in",
  "/sign-in/tenant",
  "/sign-up",
  "/sign-up/check-email",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/invite",
  "/auth/callback",
  "/forbidden",
] as const;

/** Public pages a signed-in user is sent away from, to "/". */
export const SIGNED_OUT_ONLY_PAGES = ["/sign-in", "/sign-up"] as const;

/**
 * BFF routes that run without a session (TRD 7.2, 7.3). Sign-out is here so
 * it can clear cookies whatever state they are in.
 */
export const PUBLIC_API = [
  "/api/auth/config",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/register",
  "/api/auth/email/verify",
  "/api/auth/email/resend",
  "/api/auth/password/forgot",
  "/api/auth/password/reset",
  "/api/auth/invite/info",
  "/api/auth/invite/accept",
  "/api/auth/google/start",
  "/api/session",
  "/api/healthz",
  "/api/readyz",
] as const;

/** All a user holding only the restricted cookie may reach (TRD 5.7). */
export const RESTRICTED_ALLOWED = [
  "/change-password",
  "/api/auth/password/change",
  "/api/auth/logout",
] as const;

export const CHANGE_PASSWORD_PATH = "/change-password";
export const SIGN_IN_PATH = "/sign-in";

function normalise(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

function listed(list: readonly string[], path: string): boolean {
  return list.includes(normalise(path));
}

export function isApiPath(path: string): boolean {
  return path === "/api" || path.startsWith("/api/");
}

export function isPublic(path: string): boolean {
  return listed(PUBLIC_PAGES, path) || listed(PUBLIC_API, path);
}

export function isSignedOutOnly(path: string): boolean {
  return listed(SIGNED_OUT_ONLY_PAGES, path);
}

export function isRestrictedAllowed(path: string): boolean {
  return listed(RESTRICTED_ALLOWED, path);
}
