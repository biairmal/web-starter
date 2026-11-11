import {
  type IncomingMessage,
  type ServerResponse,
  createServer,
  request as httpRequest,
} from "node:http";
import { MOCK_IDENTITY_PORT, PRISM_ORIGIN } from "./env.ts";
import { fakeAccessToken } from "../helpers/tokens.ts";
import {
  MOCK_COMMON_PASSWORD,
  MOCK_GOOD_TOKEN,
  MOCK_PASSWORD,
  MOCK_TENANTS,
  MOCK_USERS,
} from "./mock-users.ts";

// A stand-in for identity in the mock e2e suite. Prism answers every path with
// random data from the spec, which cannot drive a permission test, so this
// server answers a few paths exactly and passes everything else to Prism:
//
// - GET /v1/me: built from the claims of the fake access token (see
//   tests/e2e/session.ts). A token with `revoked: true` gets a 401 without a
//   reason, as identity sends for a revoked access token; `fail: true` gets
//   a 500. `providers` sets the sign-in methods it reports.
// - PATCH /v1/me: keeps the display name for the token's session (`sid`), so
//   later GET /v1/me calls of that session answer with it.
// - POST /v1/auth/refresh: 401 REFRESH_REUSED, so a refresh ends the session.
// - POST /v1/auth/login: the accounts in tests/e2e/mock-users.ts.
// - POST /v1/auth/register and /email/resend: 202. POST /v1/auth/email/verify:
//   204 for MOCK_GOOD_TOKEN, 400 TOKEN_INVALID for anything else.
// - POST /v1/me/password: a new session; PASSWORD_POLICY for
//   MOCK_COMMON_PASSWORD; 401 INVALID_CREDENTIALS for a current password
//   other than MOCK_PASSWORD. POST /v1/auth/logout and /logout-all: 204.
// - POST /v1/auth/password/forgot: 202. /password/reset: like verify, and
//   PASSWORD_POLICY for MOCK_COMMON_PASSWORD.
// - GET /v1/auth/invite/{token} and POST /v1/auth/invite/accept: MOCK_GOOD_TOKEN
//   is an invite to Globex for a new account.
// - POST /v1/auth/exchange: MOCK_GOOD_TOKEN as the code signs in Gina Google.
// - GET /v1/auth/config: password and Google sign-in, open registration, single tenancy
//   (MOCK_TENANCY=multi switches it).

type Claims = {
  sub?: string;
  tid?: string;
  perms?: string[];
  roles?: string[];
  sa?: boolean;
  sid?: string;
  name?: string;
  revoked?: boolean;
  fail?: boolean;
  providers?: { password: boolean; google: boolean };
};

/** Display names saved through PATCH /v1/me, by session. */
const displayNames = new Map<string, string>();

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function envelope(data: unknown) {
  return { timestamp: new Date().toISOString(), data };
}

function errorEnvelope(code: string, message: string, reason?: string) {
  return {
    timestamp: new Date().toISOString(),
    error: { code, message, ...(reason ? { meta: { reason } } : {}) },
  };
}

function claimsOf(req: IncomingMessage): Claims | undefined {
  const match = /^Bearer (.+)$/.exec(req.headers.authorization ?? "");
  const payload = match?.[1]?.split(".")[1];
  if (!payload) {
    return undefined;
  }
  try {
    return JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Claims;
  } catch {
    return undefined;
  }
}

function me(res: ServerResponse, claims: Claims | undefined): void {
  if (claims?.fail) {
    json(res, 500, errorEnvelope("ERR_INTERNAL", "Something broke."));
    return;
  }
  if (!claims || claims.revoked) {
    json(res, 401, errorEnvelope("ERR_UNAUTHORIZED", "Invalid token."));
    return;
  }
  const name =
    (claims.sid === undefined ? undefined : displayNames.get(claims.sid)) ??
    claims.name ??
    "Test User";
  json(
    res,
    200,
    envelope({
      id: claims.sub ?? "00000000-0000-4000-8000-000000000001",
      email: "user@example.test",
      display_name: name,
      email_verified: true,
      is_super_admin: claims.sa ?? false,
      tenant: {
        id: claims.tid ?? "00000000-0000-4000-8000-000000000002",
        slug: "acme",
        name: "Acme",
        status: "active",
      },
      roles: claims.roles ?? [],
      permissions: claims.perms ?? [],
      providers: claims.providers ?? { password: true, google: false },
    }),
  );
}

/** PATCH /v1/me: saves the display name for this session. */
async function updateMe(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const claims = claimsOf(req);
  const body = await readBody(req);
  if (claims?.sid !== undefined && typeof body.display_name === "string") {
    displayNames.set(claims.sid, body.display_name);
  }
  me(res, claims);
}

function proxy(req: IncomingMessage, res: ServerResponse): void {
  const target = new URL(req.url ?? "/", PRISM_ORIGIN);
  const upstream = httpRequest(
    target,
    { method: req.method, headers: { ...req.headers, host: target.host } },
    (answer) => {
      res.writeHead(answer.statusCode ?? 502, answer.headers);
      answer.pipe(res);
    },
  );
  upstream.on("error", () => {
    json(res, 502, errorEnvelope("ERR_BAD_GATEWAY", "Prism is not running."));
  });
  req.pipe(upstream);
}

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(
          JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<
            string,
            unknown
          >,
        );
      } catch {
        resolve({});
      }
    });
  });
}

function tokens(name: string, mustChange = false) {
  const access = fakeAccessToken({
    ...(mustChange ? { scope: "password_change" } : {}),
  });
  // The fake token carries the display name the mock /v1/me answers with.
  const [head, payload, signature] = access.split(".");
  const claims = JSON.parse(
    Buffer.from(payload ?? "", "base64url").toString("utf8"),
  ) as Record<string, unknown>;
  const token = [
    head,
    Buffer.from(JSON.stringify({ ...claims, name })).toString("base64url"),
    signature,
  ].join(".");
  return {
    access_token: token,
    token_type: "Bearer",
    expires_in: 900,
    ...(mustChange
      ? {}
      : { refresh_token: "refresh-token-e2e", refresh_expires_in: 3600 }),
    user: { id: "00000000-0000-4000-8000-000000000001", display_name: name },
    tenant: MOCK_TENANTS[0],
    must_change_password: mustChange,
  };
}

async function login(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readBody(req);
  const user = MOCK_USERS.find((entry) => entry.email === body.email);
  if (user?.locked) {
    res.setHeader("Retry-After", "840");
    json(res, 401, {
      timestamp: new Date().toISOString(),
      error: {
        code: "ERR_UNAUTHORIZED",
        message: "unauthorized",
        meta: { reason: "ACCOUNT_LOCKED", retry_after: 840 },
      },
    });
    return;
  }
  if (!user || body.password !== MOCK_PASSWORD) {
    json(
      res,
      401,
      errorEnvelope("ERR_UNAUTHORIZED", "unauthorized", "INVALID_CREDENTIALS"),
    );
    return;
  }
  if (user.unverified) {
    json(
      res,
      403,
      errorEnvelope("ERR_FORBIDDEN", "forbidden", "EMAIL_NOT_VERIFIED"),
    );
    return;
  }
  if (user.multi && typeof body.tenant !== "string") {
    json(res, 200, envelope({ tenant_required: true, tenants: MOCK_TENANTS }));
    return;
  }
  json(res, 200, envelope(tokens(user.name, user.mustChange)));
}

/** One-time tokens in email links: MOCK_GOOD_TOKEN works, anything else is used up. */
async function oneTimeToken(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const body = await readBody(req);
  if (body.token === MOCK_GOOD_TOKEN) {
    res.writeHead(204);
    res.end();
    return;
  }
  json(
    res,
    400,
    errorEnvelope("ERR_BAD_REQUEST", "bad request", "TOKEN_INVALID"),
  );
}

/** A reset with MOCK_GOOD_TOKEN; MOCK_COMMON_PASSWORD fails the policy. */
async function reset(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readBody(req);
  if (body.token !== MOCK_GOOD_TOKEN) {
    json(
      res,
      400,
      errorEnvelope("ERR_BAD_REQUEST", "bad request", "TOKEN_INVALID"),
    );
    return;
  }
  if (body.password === MOCK_COMMON_PASSWORD) {
    json(res, 400, {
      timestamp: new Date().toISOString(),
      error: {
        code: "ERR_BAD_REQUEST",
        message: "validation failed",
        meta: {
          reason: "PASSWORD_POLICY",
          fields: { password: "password is too common" },
        },
      },
    });
    return;
  }
  res.writeHead(204);
  res.end();
}

/** POST /v1/me/password: a new session for the caller of any token. */
async function changePassword(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const claims = claimsOf(req);
  const body = await readBody(req);
  if (!claims) {
    json(res, 401, errorEnvelope("ERR_UNAUTHORIZED", "Invalid token."));
    return;
  }
  if (
    body.current_password !== undefined &&
    body.current_password !== MOCK_PASSWORD
  ) {
    json(
      res,
      401,
      errorEnvelope("ERR_UNAUTHORIZED", "unauthorized", "INVALID_CREDENTIALS"),
    );
    return;
  }
  if (body.new_password === MOCK_COMMON_PASSWORD) {
    json(res, 400, {
      timestamp: new Date().toISOString(),
      error: {
        code: "ERR_BAD_REQUEST",
        message: "validation failed",
        meta: {
          reason: "PASSWORD_POLICY",
          fields: { new_password: "password is too common" },
        },
      },
    });
    return;
  }
  json(res, 200, envelope(tokens(claims.name ?? "Test User")));
}

/** POST /v1/auth/exchange: MOCK_GOOD_TOKEN signs in Gina; anything else is used. */
async function exchange(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const body = await readBody(req);
  if (body.code !== MOCK_GOOD_TOKEN) {
    json(
      res,
      400,
      errorEnvelope("ERR_BAD_REQUEST", "bad request", "TOKEN_INVALID"),
    );
    return;
  }
  json(res, 200, envelope(tokens("Gina Google")));
}

/** GET /v1/auth/invite/{token}: MOCK_GOOD_TOKEN invites a new account to Globex. */
function inviteInfo(res: ServerResponse, token: string): void {
  if (token !== MOCK_GOOD_TOKEN) {
    json(
      res,
      400,
      errorEnvelope("ERR_BAD_REQUEST", "bad request", "TOKEN_INVALID"),
    );
    return;
  }
  json(
    res,
    200,
    envelope({
      tenant: { name: "Globex" },
      email_masked: "b**@example.test",
      has_password: false,
    }),
  );
}

/** POST /v1/auth/invite/accept: a session for the new member. */
async function acceptInvite(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const body = await readBody(req);
  if (body.token !== MOCK_GOOD_TOKEN) {
    json(
      res,
      400,
      errorEnvelope("ERR_BAD_REQUEST", "bad request", "TOKEN_INVALID"),
    );
    return;
  }
  const name =
    typeof body.display_name === "string" && body.display_name
      ? body.display_name
      : "Invited User";
  json(res, 200, envelope(tokens(name)));
}

const accepted = () => envelope({ status: "accepted" });

const server = createServer((req, res) => {
  const path = new URL(req.url ?? "/", "http://mock").pathname;
  if (req.method === "GET" && path === "/healthz") {
    json(res, 200, { status: "ok" });
  } else if (req.method === "GET" && path === "/v1/me") {
    me(res, claimsOf(req));
  } else if (req.method === "PATCH" && path === "/v1/me") {
    void updateMe(req, res);
  } else if (req.method === "POST" && path === "/v1/auth/refresh") {
    json(
      res,
      401,
      errorEnvelope("ERR_UNAUTHORIZED", "Refresh refused.", "REFRESH_REUSED"),
    );
  } else if (req.method === "POST" && path === "/v1/auth/login") {
    void login(req, res);
  } else if (
    req.method === "POST" &&
    (path === "/v1/auth/register" ||
      path === "/v1/auth/email/resend" ||
      path === "/v1/auth/password/forgot")
  ) {
    req.resume();
    json(res, 202, accepted());
  } else if (req.method === "GET" && path.startsWith("/v1/auth/invite/")) {
    inviteInfo(res, decodeURIComponent(path.slice("/v1/auth/invite/".length)));
  } else if (req.method === "POST" && path === "/v1/auth/invite/accept") {
    void acceptInvite(req, res);
  } else if (req.method === "POST" && path === "/v1/auth/exchange") {
    void exchange(req, res);
  } else if (req.method === "POST" && path === "/v1/me/password") {
    void changePassword(req, res);
  } else if (
    req.method === "POST" &&
    (path === "/v1/auth/logout" || path === "/v1/auth/logout-all")
  ) {
    req.resume();
    res.writeHead(204);
    res.end();
  } else if (req.method === "POST" && path === "/v1/auth/password/reset") {
    void reset(req, res);
  } else if (req.method === "POST" && path === "/v1/auth/email/verify") {
    void oneTimeToken(req, res);
  } else if (req.method === "GET" && path === "/v1/auth/config") {
    json(
      res,
      200,
      envelope({
        providers: { password: true, google: true },
        registration: true,
        tenancy: process.env.MOCK_TENANCY === "multi" ? "multi" : "single",
      }),
    );
  } else {
    proxy(req, res);
  }
});

server.listen(MOCK_IDENTITY_PORT, () => {
  console.log(
    `mock identity on :${String(MOCK_IDENTITY_PORT)}, proxying to ${PRISM_ORIGIN}`,
  );
});
