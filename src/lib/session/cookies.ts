import "server-only";

import { decodeJwt } from "jose";
import { z } from "zod";
import { env } from "@/config/env";
import type { TokenResponse } from "@/lib/api/types";
import { type KeyRing, seal, unseal } from "@/lib/session/crypto";

// Session cookies (TRD 5.1) and their payloads (TRD 8.1).

/** Extra lifetime of the access cookie after the token's own expiry. */
const ACCESS_COOKIE_SLACK_SECONDS = 60;
/** Lifetime of the restricted (forced password change) cookie. */
const RESTRICTED_COOKIE_SECONDS = 10 * 60;

export type CookieNames = {
  access: string;
  refresh: string;
  restricted: string;
};

export function cookieNames(
  prefix: string = env.SESSION_COOKIE_PREFIX,
): CookieNames {
  return {
    access: `__Host-${prefix}_at`,
    refresh: `__Host-${prefix}_rt`,
    restricted: `__Host-${prefix}_pc`,
  };
}

export type CookieOptions = {
  httpOnly: true;
  secure: true;
  sameSite: "lax" | "strict";
  path: "/";
  maxAge: number;
};

/** One cookie to set. An empty value with `maxAge: 0` deletes it. */
export type CookieSpec = {
  name: string;
  value: string;
  options: CookieOptions;
};

/** Anything cookies can be set on, such as `NextResponse.cookies`. */
export type CookieWriter = {
  set(name: string, value: string, options: CookieOptions): unknown;
};

/** Anything cookies can be read from, such as `NextRequest.cookies`. */
export type CookieReader = {
  get(name: string): { value: string } | undefined;
};

const accessCookieSchema = z.object({
  v: z.literal(1),
  token: z.string().min(1),
  exp: z.number().int(),
});

const refreshCookieSchema = z.object({
  v: z.literal(1),
  token: z.string().min(1),
  refreshExpiresAt: z.number().int(),
  sessionId: z.string().min(1),
});

const restrictedCookieSchema = z.object({
  v: z.literal(1),
  token: z.string().min(1),
  exp: z.number().int(),
  next: z.string().optional(),
});

export type AccessCookie = z.infer<typeof accessCookieSchema>;
export type RefreshCookie = z.infer<typeof refreshCookieSchema>;
export type RestrictedCookie = z.infer<typeof restrictedCookieSchema>;

// The access token's claims (BE TRD 6). They are not in the OpenAPI file,
// because identity's API returns the token as an opaque string.
const accessClaimsSchema = z.looseObject({
  sub: z.string(),
  tid: z.string(),
  exp: z.number(),
  iat: z.number().optional(),
  jti: z.string().optional(),
  sid: z.string().optional(),
  roles: z.array(z.string()).optional(),
  perms: z.array(z.string()).optional(),
  sa: z.boolean().optional(),
  scope: z.string().optional(),
});

export type AccessClaims = z.infer<typeof accessClaimsSchema>;

/**
 * Reads the claims of an access token without checking its signature. The
 * token came straight from identity over the internal network, and identity
 * checks the signature on every call, so the BFF only needs the values.
 */
export function decodeAccessClaims(token: string): AccessClaims {
  return accessClaimsSchema.parse(decodeJwt(token));
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function options(sameSite: "lax" | "strict", maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite,
    path: "/",
    maxAge: Math.max(0, Math.floor(maxAge)),
  };
}

function deletion(name: string, sameSite: "lax" | "strict"): CookieSpec {
  return { name, value: "", options: options(sameSite, 0) };
}

/**
 * Seals a full token response into the access and refresh cookies, and
 * deletes the restricted cookie. `sessionId` is the access token's `sid`
 * claim (the refresh-token family), which stays the same across refreshes.
 */
export async function sealSessionCookies(
  tokens: TokenResponse,
  ring?: KeyRing,
  names: CookieNames = cookieNames(),
): Promise<CookieSpec[]> {
  if (!tokens.refresh_token || tokens.refresh_expires_in === undefined) {
    throw new Error(
      "the token response has no refresh token; a restricted token is written with sealRestrictedCookie",
    );
  }
  const claims = decodeAccessClaims(tokens.access_token);
  if (!claims.sid) {
    throw new Error("the access token has no sid claim");
  }
  const now = nowSeconds();
  const access: AccessCookie = {
    v: 1,
    token: tokens.access_token,
    exp: claims.exp,
  };
  const refresh: RefreshCookie = {
    v: 1,
    token: tokens.refresh_token,
    refreshExpiresAt: now + tokens.refresh_expires_in,
    sessionId: claims.sid,
  };
  return [
    {
      name: names.access,
      value: await seal(access, ring),
      options: options("lax", claims.exp - now + ACCESS_COOKIE_SLACK_SECONDS),
    },
    {
      name: names.refresh,
      value: await seal(refresh, ring),
      options: options("lax", tokens.refresh_expires_in),
    },
    deletion(names.restricted, "strict"),
  ];
}

/**
 * Seals a restricted token (`scope: password_change`) into the restricted
 * cookie and deletes the access and refresh cookies (TRD 5.7).
 */
export async function sealRestrictedCookie(
  token: string,
  next?: string,
  ring?: KeyRing,
  names: CookieNames = cookieNames(),
): Promise<CookieSpec[]> {
  const claims = decodeAccessClaims(token);
  const now = nowSeconds();
  const restricted: RestrictedCookie = {
    v: 1,
    token,
    exp: claims.exp,
    ...(next === undefined ? {} : { next }),
  };
  return [
    {
      name: names.restricted,
      value: await seal(restricted, ring),
      options: options(
        "strict",
        Math.min(RESTRICTED_COOKIE_SECONDS, claims.exp - now),
      ),
    },
    deletion(names.access, "lax"),
    deletion(names.refresh, "lax"),
  ];
}

/** Deletes all three session cookies. */
export function clearedSessionCookies(
  names: CookieNames = cookieNames(),
): CookieSpec[] {
  return [
    deletion(names.access, "lax"),
    deletion(names.refresh, "lax"),
    deletion(names.restricted, "strict"),
  ];
}

export function applyCookies(
  target: CookieWriter,
  specs: readonly CookieSpec[],
): void {
  for (const spec of specs) {
    target.set(spec.name, spec.value, spec.options);
  }
}

/** Sets the access and refresh cookies on a response from a token response. */
export async function writeSession(
  res: { cookies: CookieWriter },
  tokens: TokenResponse,
): Promise<CookieSpec[]> {
  const specs = await sealSessionCookies(tokens);
  applyCookies(res.cookies, specs);
  return specs;
}

/** Sets only the restricted cookie on a response, for a forced password change. */
export async function writeRestricted(
  res: { cookies: CookieWriter },
  token: string,
  next?: string,
): Promise<CookieSpec[]> {
  const specs = await sealRestrictedCookie(token, next);
  applyCookies(res.cookies, specs);
  return specs;
}

/** Deletes every session cookie on a response. */
export function clearSession(res: { cookies: CookieWriter }): void {
  applyCookies(res.cookies, clearedSessionCookies());
}

async function readCookie<T>(
  reader: CookieReader,
  name: string,
  schema: z.ZodType<T>,
  ring?: KeyRing,
): Promise<T | null> {
  const raw = reader.get(name)?.value;
  if (!raw) {
    return null;
  }
  const result = schema.safeParse(await unseal(raw, ring));
  return result.success ? result.data : null;
}

export type SessionCookies = {
  access: AccessCookie | null;
  refresh: RefreshCookie | null;
  restricted: RestrictedCookie | null;
};

/**
 * Opens the three session cookies. A cookie that is missing, tampered with,
 * sealed with an unknown key or of an unknown version reads as `null`.
 */
export async function readSessionCookies(
  reader: CookieReader,
  ring?: KeyRing,
  names: CookieNames = cookieNames(),
): Promise<SessionCookies> {
  const [access, refresh, restricted] = await Promise.all([
    readCookie(reader, names.access, accessCookieSchema, ring),
    readCookie(reader, names.refresh, refreshCookieSchema, ring),
    readCookie(reader, names.restricted, restrictedCookieSchema, ring),
  ]);
  return { access, refresh, restricted };
}
