import { hkdfSync } from "node:crypto";
import type { BrowserContext } from "@playwright/test";
import { CompactEncrypt } from "jose";
import { APP_ORIGIN, SESSION_COOKIE_PREFIX, SESSION_SECRET } from "./env";
import {
  type TestClaims,
  fakeAccessToken,
  nowSeconds,
} from "../helpers/tokens";

// Signs a Playwright browser context in by writing the session cookies the BFF
// expects (TRD 5.1, 8.1). The sealing repeats src/lib/session/crypto.ts,
// which cannot be imported here because of `server-only`;
// tests/unit/e2e-session.test.ts checks that the BFF opens these cookies.

const HKDF_INFO = "web-starter session cookie v1";

export type E2eClaims = TestClaims & {
  name?: string;
  /** The mock identity answers GET /v1/me with 401 for this token. */
  revoked?: boolean;
};

function key(secret: string): Uint8Array {
  return new Uint8Array(
    hkdfSync(
      "sha256",
      Buffer.from(secret, "base64"),
      new Uint8Array(0),
      HKDF_INFO,
      32,
    ),
  );
}

export function sealForTest(
  payload: unknown,
  secret: string = SESSION_SECRET,
): Promise<string> {
  return new CompactEncrypt(new TextEncoder().encode(JSON.stringify(payload)))
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .encrypt(key(secret));
}

export type SessionCookie = { name: string; value: string };

/** The sealed access and refresh cookies for a session with these claims. */
export async function sessionCookies(
  claims: E2eClaims = {},
  secret: string = SESSION_SECRET,
): Promise<SessionCookie[]> {
  const exp = claims.exp ?? nowSeconds() + 900;
  const sid = claims.sid ?? "00000000-0000-4000-8000-0000000000aa";
  const token = fakeAccessToken({ ...claims, exp, sid });
  return [
    {
      name: `__Host-${SESSION_COOKIE_PREFIX}_at`,
      value: await sealForTest({ v: 1, token, exp }, secret),
    },
    {
      name: `__Host-${SESSION_COOKIE_PREFIX}_rt`,
      value: await sealForTest(
        {
          v: 1,
          token: "refresh-token-e2e",
          refreshExpiresAt: nowSeconds() + 3600,
          sessionId: sid,
        },
        secret,
      ),
    },
  ];
}

/** Signs the context in as a user with these claims (`perms`, `sa`, `name`…). */
export async function signIn(
  context: BrowserContext,
  claims: E2eClaims = {},
): Promise<void> {
  const cookies = await sessionCookies(claims);
  // Chrome refuses a Secure cookie set for an http:// URL, but sends Secure
  // cookies to http://localhost. Cookies are not scoped by port.
  const url = new URL(APP_ORIGIN);
  url.protocol = "https:";
  url.port = "";
  await context.addCookies(
    cookies.map((cookie) => ({
      ...cookie,
      url: url.origin,
      httpOnly: true,
      secure: true,
      sameSite: "Lax" as const,
    })),
  );
}
