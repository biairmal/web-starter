# Security

web-starter is the browser-facing half of every client project. It holds users' sessions and forwards their requests
to go-identity and the resource services, so a flaw here exposes accounts. This page covers how to report a
vulnerability, what the app defends against, how to deploy it safely, and the limits it has today.

## Reporting a vulnerability

**Do not open a public issue, PR or discussion for a security problem.**

Report it privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**.
Include:

- what an attacker can do, and what they need first (a session, a role, a victim who clicks a link);
- steps that reproduce it, with the browser and version;
- the commit or image tag you tested.

You can expect an acknowledgement within 7 days. Once the issue is confirmed, the fix is released, and a GitHub
security advisory credits you unless you'd rather stay anonymous. Please give us a reasonable time to ship the fix
before you disclose it.

**In scope:** this repository's code, its configuration defaults and its Docker image.
**Out of scope:** findings that need a deployment to ignore the [deployment checklist](#deploying-safely);
vulnerabilities in [go-identity](https://github.com/biairmal/go-identity) or a resource service (report those in their
repositories); and UI checks that hide a button the API would refuse anyway (the API is the enforcement point).

## Supported versions

Fixes land on `main` and in the next `v*` tag. Projects started from an older version don't update automatically:
watch this repository's security advisories and apply the fix to each project by hand.

## What the app defends against

| Threat                                    | Defence                                                                                                                                                                                                                                          | Where                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Token theft by a script in the page (XSS) | Tokens never reach the browser. They live in `httpOnly`, `Secure` cookies that only the server reads, and the browser calls only same-origin `/api/*` routes                                                                                     | `src/lib/session/cookies.ts`, `src/lib/bff`              |
| Reading or forging a session cookie       | Cookies are encrypted and authenticated (JWE, `dir` + A256GCM). A tampered or unknown-key cookie is treated as no session. `SESSION_SECRET` takes a comma-separated key ring, so keys rotate without signing anyone out                          | `src/lib/session/crypto.ts`                              |
| Cross-site request forgery                | Every mutating `/api` request must come from this app's `Origin` and carry a custom header that a cross-site form or a no-cors fetch can't set. Session cookies are `SameSite=Lax` (`Strict` for the restricted cookie)                          | `src/lib/bff/csrf.ts`                                    |
| Injected scripts and clickjacking         | A per-request nonce Content Security Policy: only nonced scripts run, `connect-src 'self'`, `frame-ancestors 'none'`                                                                                                                             | `src/lib/security/csp.ts`, `src/middleware.ts`           |
| Using the BFF as an open proxy            | Each proxy forwards only allow-listed upstream paths, and anything else is 404 `NOT_ALLOWED`. Path segments with control characters, slashes, backslashes or `%` are refused. Only selected headers go upstream, and never the browser's cookies | `src/lib/bff/allowlist.ts`, `src/lib/bff/proxy.ts`       |
| Tokens leaking through URLs or logs       | Tokens never appear in URLs. Google sign-in finishes with a one-time code that the server exchanges. Tokens, cookies, passwords and emails are never logged or rendered                                                                          | `src/app/auth/callback/route.ts`, [AGENTS.md](AGENTS.md) |
| Refresh-token reuse races                 | Refresh is single-flight per session: concurrent requests share one upstream refresh, so a rotated token is never presented twice                                                                                                                | `src/lib/session/refresh.ts`                             |
| A forced password change being skipped    | A restricted session can reach only the password change, and it lasts at most 10 minutes                                                                                                                                                         | `src/lib/session/route-rules.ts`, `cookies.ts`           |
| A signed-out tab staying usable           | Sign-out and session end are broadcast to every tab. A stale tab rechecks its session at the user's next action                                                                                                                                  | `src/lib/session-sync.ts`                                |
| Starting with a bad configuration         | Every environment variable is validated at start. A missing or malformed one stops the server with its name                                                                                                                                      | `src/config/env-schema.ts`                               |
| Container breakout                        | The image runs as a non-root user, needs no writable root filesystem, and contains no package manager or source                                                                                                                                  | `Dockerfile`, [docs/deploy.md](docs/deploy.md)           |
| Vulnerable dependencies                   | Dependencies are locked in `bun.lock`, and CI builds from it                                                                                                                                                                                     | `bun.lock`, `.github/workflows/ci.yml`                   |

Permission checks in the UI (`src/lib/authz`) only shape navigation and buttons. Identity and the resource services
enforce every rule.

How these fit together is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Deploying safely

The server refuses to start with a missing or malformed environment variable. Everything below is the operator's job:

- [ ] Served only over HTTPS. The session cookies are `Secure`, so plain HTTP can't sign anyone in.
- [ ] `SESSION_SECRET` is 32+ random bytes (`openssl rand -base64 32`), kept in a secret store. To rotate it, put the
      new key first and keep the old one until the longest session has ended.
- [ ] `APP_URL` is the exact public origin, and identity's `FRONTEND_URL` (`modules.auth.frontend_urls`) is the same
      value. The CSRF check compares against it.
- [ ] `IDENTITY_INTERNAL_URL` and every `*_INTERNAL_URL` point at the internal network (Compose service, cluster DNS),
      not the public internet.
- [ ] `TRUSTED_PROXY_HOPS` equals the number of proxies in front of the app. Too high lets a client fake its IP in
      `X-Forwarded-For`, and identity's per-IP rate limits key on it.
- [ ] `SESSION_COOKIE_PREFIX` is unique when several apps share a domain.
- [ ] The container runs with a read-only root filesystem and a `tmpfs` or `emptyDir` on `/tmp`
      ([docs/deploy.md](docs/deploy.md)).

## Known limitations

These are deliberate for now. They are not bugs to report:

- **Single-flight refresh is per replica.** Two replicas refreshing the same session at once both reach identity.
  Identity's refresh grace window (10 seconds) treats the second as a sibling, not as reuse.
- **An access token stays usable until it expires** (15 minutes), even after the user loses a role. The UI updates
  at the next refresh.
- **No MFA.** It isn't offered by go-identity yet.
- **Tab sync needs `BroadcastChannel`.** Without it, a tab learns of a sign-out on its next request.
- **No automated dependency vulnerability scan.** CI installs from the lockfile but runs no `audit` step, and
  there is no Renovate config. Check advisories when you upgrade.
