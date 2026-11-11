import {
  type IncomingMessage,
  type ServerResponse,
  createServer,
  request as httpRequest,
} from "node:http";
import { MOCK_IDENTITY_PORT, PRISM_ORIGIN } from "./env.ts";
import { fakeAccessToken } from "../helpers/tokens.ts";
import { MOCK_PASSWORD, MOCK_TENANTS, MOCK_USERS } from "./mock-users.ts";

// A stand-in for identity in the mock e2e suite. Prism answers every path with
// random data from the spec, which cannot drive a permission test, so this
// server answers a few paths exactly and passes everything else to Prism:
//
// - GET /v1/me: built from the claims of the fake access token (see
//   tests/e2e/session.ts). A token with `revoked: true` gets a 401 without a
//   reason, as identity sends for a revoked access token; ail: true gets
//   a 500.
// - POST /v1/auth/refresh: 401 REFRESH_REUSED, so a refresh ends the session.
// - POST /v1/auth/login: the accounts in tests/e2e/mock-users.ts.
// - GET /v1/auth/config: password sign-in, open registration, single tenancy
//   (MOCK_TENANCY=multi switches it).

type Claims = {
  sub?: string;
  tid?: string;
  perms?: string[];
  roles?: string[];
  sa?: boolean;
  name?: string;
  revoked?: boolean;
  fail?: boolean;
};

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
  const name = claims.name ?? "Test User";
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
      providers: { password: true, google: false },
    }),
  );
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
  if (user.multi && typeof body.tenant !== "string") {
    json(res, 200, envelope({ tenant_required: true, tenants: MOCK_TENANTS }));
    return;
  }
  json(res, 200, envelope(tokens(user.name, user.mustChange)));
}

const server = createServer((req, res) => {
  const path = new URL(req.url ?? "/", "http://mock").pathname;
  if (req.method === "GET" && path === "/healthz") {
    json(res, 200, { status: "ok" });
  } else if (req.method === "GET" && path === "/v1/me") {
    me(res, claimsOf(req));
  } else if (req.method === "POST" && path === "/v1/auth/refresh") {
    json(
      res,
      401,
      errorEnvelope("ERR_UNAUTHORIZED", "Refresh refused.", "REFRESH_REUSED"),
    );
  } else if (req.method === "POST" && path === "/v1/auth/login") {
    void login(req, res);
  } else if (req.method === "GET" && path === "/v1/auth/config") {
    json(
      res,
      200,
      envelope({
        providers: { password: true, google: false },
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
