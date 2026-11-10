import type { TokenResponse } from "@/lib/api/types";

// Builds JWT-shaped strings for tests. The BFF only decodes claims; identity
// checks signatures, so the signature here is filler.

function base64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export type TestClaims = {
  sub?: string;
  tid?: string;
  sid?: string;
  exp?: number;
  scope?: string;
  roles?: string[];
  perms?: string[];
  sa?: boolean;
};

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** A JWT-shaped access token. `padTo` grows it to about that many characters. */
export function fakeAccessToken(claims: TestClaims = {}, padTo = 0): string {
  const payload: Record<string, unknown> = {
    sub: "00000000-0000-4000-8000-000000000001",
    tid: "00000000-0000-4000-8000-000000000002",
    sid: "00000000-0000-4000-8000-0000000000aa",
    exp: nowSeconds() + 900,
    iat: nowSeconds(),
    ...claims,
  };
  const head = base64url({ alg: "RS256", typ: "JWT", kid: "test" });
  let token = `${head}.${base64url(payload)}.signature`;
  if (padTo > token.length) {
    payload.pad = "x".repeat(Math.ceil(((padTo - token.length) * 3) / 4));
    token = `${head}.${base64url(payload)}.signature`;
  }
  return token;
}

export function tokenResponse(
  claims: TestClaims = {},
  overrides: Partial<TokenResponse> = {},
): TokenResponse {
  return {
    access_token: fakeAccessToken(claims),
    token_type: "Bearer",
    expires_in: 900,
    refresh_token: "refresh-token-1",
    refresh_expires_in: 2_592_000,
    user: {
      id: "00000000-0000-4000-8000-000000000001",
      display_name: "Test User",
    },
    tenant: {
      id: "00000000-0000-4000-8000-000000000002",
      slug: "default",
      name: "Default",
    },
    must_change_password: false,
    ...overrides,
  };
}
