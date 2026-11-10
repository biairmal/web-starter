import "server-only";

import { cookies } from "next/headers";
import {
  type AccessClaims,
  type CookieReader,
  decodeAccessClaims,
  readSessionCookies,
} from "@/lib/session/cookies";

/** A signed-in session as the server sees it. Never sent to the browser. */
export type Session = {
  accessToken: string;
  /** Unix seconds when the access token expires. */
  expiresAt: number;
  claims: AccessClaims;
  /** The `sid` claim: the refresh-token family, as in `GET /v1/me/sessions`. */
  sessionId: string;
  refreshToken: string;
};

/**
 * Builds the session from a cookie source. Needs both the access and the
 * refresh cookie; anything missing or unreadable is no session.
 */
export async function sessionFrom(
  reader: CookieReader,
): Promise<Session | null> {
  const { access, refresh } = await readSessionCookies(reader);
  if (!access || !refresh) {
    return null;
  }
  let claims: AccessClaims;
  try {
    claims = decodeAccessClaims(access.token);
  } catch {
    return null;
  }
  return {
    accessToken: access.token,
    expiresAt: access.exp,
    claims,
    sessionId: refresh.sessionId,
    refreshToken: refresh.token,
  };
}

/** The current session in a Server Component or route handler. */
export async function getSession(): Promise<Session | null> {
  return sessionFrom(await cookies());
}
