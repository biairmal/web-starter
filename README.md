# web-starter

[![CI](https://github.com/biairmal/web-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/biairmal/web-starter/actions/workflows/ci.yml)

The reusable web app every client project starts from: sign-in, sign-up and account screens, and an admin console
for users, roles, tenants and the audit log, wired to [go-identity](https://github.com/biairmal/go-identity) through
a BFF. Business screens plug in next to them (the example is notes, against
[go-service-template](https://github.com/biairmal/go-service-template)). Next.js App Router, TypeScript, Tailwind and
shadcn/ui.

New to the codebase? Start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Requirements are in the workspace's
`project-files/phase2/frontend/` (PRD, TRD, APP_FLOW, IMPLEMENTATION_PLAN).

## Quick start

Needs Node.js 22+ and bun (the version is pinned in `package.json` `packageManager`).

```bash
bun install
cp .env.example .env.local
# In .env.local, set SESSION_SECRET to the output of: openssl rand -base64 32
bun run mock       # terminal 1: a mock of identity on http://localhost:4010
bun run dev        # terminal 2: the app on http://localhost:3000
curl localhost:3000/api/healthz
```

The mock answers with generated data, so it is enough for building screens. To sign in for real, run
go-identity locally (its README quick start, on `:8080`), set `IDENTITY_INTERNAL_URL` and `IDENTITY_PUBLIC_URL` to
`http://localhost:8080`, and make sure identity's `FRONTEND_URL` is `http://localhost:3000`.

## Configuration

Every variable is in [.env.example](.env.example) with what it does. The server checks every variable when it starts
and names any that are missing or wrong. Outside local, these matter most:

| Variable                                       | Why                                                                               |
| ---------------------------------------------- | --------------------------------------------------------------------------------- |
| `SESSION_SECRET`                               | Encrypts the session cookies. 32+ random bytes, base64. Comma-separated to rotate |
| `APP_URL`                                      | The exact public origin. Identity's `FRONTEND_URL` must be the same value         |
| `IDENTITY_INTERNAL_URL`, `IDENTITY_PUBLIC_URL` | Identity on the internal network, and its public origin for the Google redirect   |
| `TRUSTED_PROXY_HOPS`                           | The number of proxies in front of the app                                         |

Branding lives in `src/config/brand.ts`, colours and spacing in `src/app/tokens.css`, and the font in
`src/app/fonts.ts` with the file in `public/fonts/`. See `docs/DECISIONS.md` (F0.2) for how the design tokens map to
Tailwind and shadcn.

## Commands

```bash
bun run dev        # Next.js dev server with Turbopack, http://localhost:3000
bun run build      # production build
bun run start      # serve the production build
bun run check      # lint, typecheck, format, API types, i18n keys, tests (run before every PR)
bun run format     # Prettier, writes files
```

Use `bun run <script>`, never `bun test`: that is Bun's own test runner, not Vitest.

## API contract

The identity API is described by `openapi/identity.yaml`, a copy of go-identity's `api/openapi.yaml`.
`openapi/identity.source.json` records which commit it came from.

```bash
bun run api:sync   # copy the spec from IDENTITY_REPO_PATH (default ../go-identity)
bun run api:gen    # regenerate src/lib/api/schema.d.ts
bun run api:check  # fails when the generated types are stale (part of bun run check)
bun run mock       # Prism mock of identity on http://localhost:4010 (dynamic responses)
```

Import types from `src/lib/api/types.ts`, never from `schema.d.ts`. Adding a business screen backed by your own
service is in [docs/adding-a-module.md](docs/adding-a-module.md).

## Translations

Every user-facing string is in `messages/en.json` (the source) and `messages/id.json`, keyed by feature
(`auth.signIn.title`). Keys passed to `t()` are type-checked against `en.json`.

```bash
bun run i18n:check # fails when a key is in one locale but not the other (part of bun run check)
```

The locale comes from the `{prefix}_locale` cookie, then `Accept-Language`, then `NEXT_PUBLIC_DEFAULT_LOCALE`. There
is no locale in the URL.

## Layout

```text
src/app/          routes (App Router): (public), (restricted), (app) the signed-in shell, api/ the BFF
src/features/     one folder per area: components and TanStack Query hooks
src/components/   shared UI; ui/ holds the shadcn/ui primitives (Radix base), owned by this repo
src/lib/          session, BFF, API client and generated types, permission checks, CSP
src/config/       env validation, brand, navigation
```

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) explains each part. Add a shadcn/ui component with
`bun x shadcn add <component>` (config in `components.json`, Radix base, Vega preset).

## Testing

```bash
bun run test       # unit and component tests (Vitest; jsdom for component tests)
bun run e2e:mock   # Playwright against the Prism mock and next dev (starts both)
bun run e2e:full   # Playwright against a real identity stack (set E2E_BASE_URL)
```

The mock suite talks to `tests/e2e/mock-identity.mts`, which answers `GET /v1/me` from the test token's claims and
passes everything else to Prism. Sign a test in with `signIn(context, { perms: ["users:read"] })` from
`tests/e2e/session.ts`.

Unit tests and component tests use MSW fixtures from `tests/msw/handlers.ts`. Accessibility checks use
`expectNoA11yViolations` from `tests/e2e/fixtures.ts`, which fails on critical and serious axe violations.
`bun run check` runs the unit and component tests; `bun run e2e:mock` is a separate job in CI, because it needs a
browser.

## Deployment

One container image, configured only by environment variables, runs on Docker Compose next to identity or on
Kubernetes or OpenShift. [docs/deploy.md](docs/deploy.md) covers the image, health endpoints, environment, and
the Compose and Helm setups.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the git conventions, PR process and Definition of Done, and
[AGENTS.md](AGENTS.md) for the code rules. Both apply to humans and AI agents alike. UI changes also follow
[DESIGN.md](DESIGN.md) and [UI_REVIEW_WORKFLOW.md](UI_REVIEW_WORKFLOW.md).

## Security

Report vulnerabilities privately, never in a public issue. [SECURITY.md](SECURITY.md) has how to report, what the app
defends against, and a checklist for deploying it safely.
