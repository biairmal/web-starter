// A stand-in for Google's OpenID Connect provider, for the full e2e suite
// only (deploy/compose.e2e.yaml). Node built-ins only. It does what
// go-identity's Google provider needs: discovery, an authorization endpoint
// (a form where the test types the Google account), the token endpoint with
// PKCE (S256) and a JWKS. ID tokens are RS256, `aud` is the client ID, and the
// nonce is echoed back.
//
// Never use it outside tests: it signs in whoever types an address.

import {
  createHash,
  generateKeyPairSync,
  randomBytes,
  sign,
} from "node:crypto";
import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 9090);
const ISSUER = (process.env.ISSUER ?? `http://localhost:${PORT}`).replace(
  /\/$/,
  "",
);
const CLIENT_ID = process.env.CLIENT_ID ?? "e2e-client";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const KID = "fake-oidc-1";
const jwk = {
  ...publicKey.export({ format: "jwk" }),
  kid: KID,
  alg: "RS256",
  use: "sig",
};

/** code -> { email, name, verified, nonce, challenge, clientId, redirectUri } */
const codes = new Map();

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

function idToken(claims) {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: KID }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    JSON.stringify({ iss: ISSUER, iat: now, exp: now + 300, ...claims }),
  );
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(`${header}.${payload}`),
    privateKey,
  );
  return `${header}.${payload}.${b64url(signature)}`;
}

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function html(res, body) {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(body);
}

function escape(value) {
  return String(value).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

async function readForm(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

/** The sign-in form: every query parameter is carried through hidden fields. */
function authorizeForm(query) {
  const hidden = [...query.entries()]
    .map(
      ([k, v]) =>
        `<input type="hidden" name="${escape(k)}" value="${escape(v)}">`,
    )
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Fake Google sign-in</title></head><body><main>
<h1>Fake Google sign-in</h1>
<form method="post" action="/authorize">${hidden}
<label>Email <input name="login_email" type="email" required></label>
<label>Name <input name="login_name"></label>
<label><input name="login_unverified" type="checkbox"> Email not verified</label>
<button type="submit">Continue</button>
</form></main></body></html>`;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", ISSUER);
  try {
    if (
      req.method === "GET" &&
      url.pathname === "/.well-known/openid-configuration"
    ) {
      return json(res, 200, {
        issuer: ISSUER,
        authorization_endpoint: `${ISSUER}/authorize`,
        token_endpoint: `${ISSUER}/token`,
        jwks_uri: `${ISSUER}/jwks`,
        response_types_supported: ["code"],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["RS256"],
        code_challenge_methods_supported: ["S256"],
      });
    }
    if (req.method === "GET" && url.pathname === "/jwks") {
      return json(res, 200, { keys: [jwk] });
    }
    if (req.method === "GET" && url.pathname === "/healthz") {
      return json(res, 200, { ok: true });
    }
    if (req.method === "GET" && url.pathname === "/authorize") {
      return html(res, authorizeForm(url.searchParams));
    }
    if (req.method === "POST" && url.pathname === "/authorize") {
      const form = await readForm(req);
      const redirectUri = form.get("redirect_uri");
      const email = (form.get("login_email") ?? "").trim().toLowerCase();
      if (!redirectUri || !email || form.get("client_id") !== CLIENT_ID) {
        return json(res, 400, { error: "invalid_request" });
      }
      const code = randomBytes(16).toString("hex");
      codes.set(code, {
        email,
        name: form.get("login_name") || email.split("@")[0],
        verified: form.get("login_unverified") !== "on",
        nonce: form.get("nonce") ?? undefined,
        challenge: form.get("code_challenge") ?? undefined,
        clientId: form.get("client_id"),
        redirectUri,
      });
      const back = new URL(redirectUri);
      back.searchParams.set("code", code);
      const state = form.get("state");
      if (state) back.searchParams.set("state", state);
      res.writeHead(302, { location: back.toString() });
      return res.end();
    }
    if (req.method === "POST" && url.pathname === "/token") {
      const form = await readForm(req);
      const grant = codes.get(form.get("code") ?? "");
      codes.delete(form.get("code") ?? "");
      if (!grant || form.get("redirect_uri") !== grant.redirectUri) {
        return json(res, 400, { error: "invalid_grant" });
      }
      if (grant.challenge) {
        const verifier = form.get("code_verifier") ?? "";
        const expected = createHash("sha256")
          .update(verifier)
          .digest("base64url");
        if (expected !== grant.challenge) {
          return json(res, 400, {
            error: "invalid_grant",
            error_description: "PKCE",
          });
        }
      }
      const sub = createHash("sha256")
        .update(grant.email)
        .digest("hex")
        .slice(0, 21);
      return json(res, 200, {
        access_token: randomBytes(16).toString("hex"),
        token_type: "Bearer",
        expires_in: 300,
        id_token: idToken({
          sub,
          aud: grant.clientId,
          email: grant.email,
          email_verified: grant.verified,
          name: grant.name,
          ...(grant.nonce ? { nonce: grant.nonce } : {}),
        }),
      });
    }
    json(res, 404, { error: "not_found" });
  } catch (error) {
    json(res, 500, { error: "server_error", error_description: String(error) });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`fake-oidc: issuer ${ISSUER}, client ${CLIENT_ID}`);
});
