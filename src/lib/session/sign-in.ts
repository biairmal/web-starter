import "server-only";

import type { TenantChoice, TokenResponse } from "@/lib/api/types";
import {
  type CookieWriter,
  applyCookies,
  sealRestrictedCookie,
  sealSessionCookies,
} from "@/lib/session/cookies";
import { CHANGE_PASSWORD_PATH } from "@/lib/session/route-rules";

// What the BFF does with a token response from identity (TRD 5.4, 5.5, 5.7):
// a full session sets the access and refresh cookies; a forced password
// change sets only the restricted cookie and sends the user to change it.

export function isTokenResponse(value: unknown): value is TokenResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "access_token" in value &&
    typeof value.access_token === "string" &&
    value.access_token.length > 0 &&
    "must_change_password" in value &&
    typeof value.must_change_password === "boolean"
  );
}

export function isTenantChoice(value: unknown): value is TenantChoice {
  return (
    typeof value === "object" &&
    value !== null &&
    "tenant_required" in value &&
    value.tenant_required === true &&
    "tenants" in value &&
    Array.isArray(value.tenants)
  );
}

/**
 * Writes the cookies for a token response and returns where the browser goes
 * next: `next` for a full session, `/change-password` for a restricted one
 * (which keeps `next` for after the change).
 */
export async function startSession(
  tokens: TokenResponse,
  next: string,
  cookies: CookieWriter,
): Promise<string> {
  if (tokens.must_change_password || !tokens.refresh_token) {
    applyCookies(
      cookies,
      await sealRestrictedCookie(tokens.access_token, next),
    );
    return CHANGE_PASSWORD_PATH;
  }
  applyCookies(cookies, await sealSessionCookies(tokens));
  return next;
}
