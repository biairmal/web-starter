# Release pass v0.1.0

> **Date:** 2026-11-12 · **Branch:** `fe/F7.4-release-pass` (F7.1, F7.2 and F7.3 merged in) ·
> **identity:** go-identity `main` at `cbd2db4`, built locally as `go-identity:local`
>
> **Verdict: not ready to tag.** The PRD section 8 release criteria pass. Lighthouse performance now passes, and
> LCP passes over HTTP/2 as production serves it. The sign-in JavaScript budget (TRD 12) still fails at 189.6 KB
> against 120 KB, and 120 KB is below what React, Next.js and next-intl need on their own. `v0.1.0` is not
> tagged; see "Before tagging".

## PRD section 8 release criteria

| Criterion                                               | Result   | Evidence                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every **M** requirement passes a test that names its ID | **Pass** | All 31 M IDs (FE-1…FE-10, FE-20…FE-23, FE-30…FE-32, FE-40…FE-47, FE-50, FE-51, FE-60…FE-63) appear in passing test titles. FE-23, FE-60, FE-61 and FE-63 were named in this pass (`session-provider.test.tsx`, `brand.test.ts`, new `api-types.test.ts`, new `mock-api.spec.ts`). |
| axe: no critical violation on Phase 2 screens           | **Pass** | `tests/e2e/mock/axe-routes.spec.ts`: every route in TRD 6.1, light and dark, no critical **or serious** violation (36 single-mode checks; 6 more with `MOCK_TENANCY=multi`). `/change-password` needs the restricted cookie and is checked in `change-password.spec.ts`.          |
| e2e suite passes against a real identity stack          | **Pass** | `pnpm e2e:full`, single then multi mode on fresh stacks: 17 + 5 passed, twice in a row on F7.1 and once more on this branch. Two web replicas behind Caddy throughout.                                                                                                            |
| A rebranded fresh copy passes the smoke test            | **Pass** | `pnpm rebrand:smoke`: copy renamed "Globex Hub", new support email, new `--brand-accent` (light and dark) and logos; mock suite 98 passed, 6 skipped (multi-only).                                                                                                                |

## Plan F7.4 targets

Lighthouse 12.8.2, simulated mobile (4× CPU, 150 ms RTT, 1.6 Mbps), `/sign-in`, the production image (two
replicas) behind Caddy, three runs each. "HTTP/2" is HTTPS through a Caddy with `tls internal`, which is how
production serves the app (`deploy/Caddyfile`); "HTTP/1.1" is the e2e stack's plain-HTTP Caddy.

| Target                                           | Result                              | Measured after the fixes                                                                             |
| ------------------------------------------------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Lighthouse `/sign-in`, mobile: performance ≥ 90  | **Pass**                            | HTTP/2: 99, 98, 98. HTTP/1.1: 94, 95, 95.                                                            |
| LCP < 2.5 s (mobile)                             | **Pass** on HTTP/2; not on HTTP/1.1 | HTTP/2: 2.1, 2.0, 2.3 s. HTTP/1.1: 3.0, 3.0, 3.0 s. FCP 0.9–1.1 s, TBT 20–140 ms, CLS 0.             |
| Bundle budget: sign-in JS ≤ 120 KB gzip (TRD 12) | **Fail**                            | 189.6 KB gzip over 20 files (`pnpm build && pnpm budget`, now counting every chunk the route loads). |
| Image under 200 MB (F7.2)                        | Pass                                | 183 MiB (~192 MB) unpacked, 61.5 MB compressed.                                                      |

The first pass recorded performance 83, 92, 85 and LCP 4.4, 3.2, 4.2 s (HTTP/1.1). The branch before the fixes,
measured again next to the fixed build on the same machine, gave:

| Build  | HTTP/2: performance, LCP     | HTTP/1.1: performance, LCP   | Sign-in JS (full count) |
| ------ | ---------------------------- | ---------------------------- | ----------------------- |
| Before | 92, 97, 98 · 3.0, 2.4, 1.8 s | 94, 93, 93 · 3.0, 3.2, 3.1 s | 280.7 KB, 27 files      |
| After  | 99, 98, 98 · 2.1, 2.0, 2.3 s | 94, 95, 95 · 3.0, 3.0, 3.0 s | 189.6 KB, 20 files      |

So the first pass's low scores were partly run-to-run noise. The fixes make HTTP/2 LCP pass on every run (before:
one in three failed) and cut TBT. On HTTP/1.1, LCP stays at 3.0 s with either build: every request queues on six
connections, and the simulated link charges about 0.56 s per round, so the request count sets LCP there, not the
bytes.

### What was fixed

| Finding                                                                                                         | Fix                                                                                             | Sign-in JS saved |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------- |
| Turbopack's production build bundled Zod with all of its locales (94 KB gzip in one chunk).                     | `pnpm build` uses webpack; `pnpm dev` keeps Turbopack.                                          | ~134 KB          |
| The `radix-ui` barrel shipped whole (37 KB) on every page through the root `forbidden.tsx` and `not-found.tsx`. | `optimizePackageImports: ["radix-ui"]`.                                                         | ~65 KB           |
| Zod loaded on every page (`brand.ts`'s schema, the client `jitless` setting) and with the sign-in form.         | `brand-schema.ts`; `zod/v4/core` for the setting; the sign-in schema loads on first validation. | ~23 KB           |
| sonner loaded on every page (root Toaster) and with the public forms.                                           | Toaster through `next/dynamic`; public screens toast through `src/lib/toast.ts`.                | ~9 KB            |
| The root `TooltipProvider` put Radix's popper on every page; `global-error.tsx` bundled every message.          | The provider moved into the permission matrix; global-error passes one namespace.               | ~26 KB           |
| `pnpm budget` counted only the page's own manifest entry (13 files; the browser loads 28).                      | It counts the page and every layout and boundary above it.                                      | –                |

### Why 120 KB is out of reach

React DOM (53 KB), the Next.js runtime (49 KB) and the next-intl client (11.5 KB) are about 116 KB gzip before any
app code. The rest of the 189.6 KB is the route's own code and its libraries: React Hook Form (13.6 KB), TanStack
Query, the error boundaries Next loads on every page, `openapi-fetch` and `tailwind-merge`. Going further means
dropping React Hook Form or TanStack Query from the public screens, against the AGENTS.md conventions.

## Found and fixed in this pass

| Finding                                                                                                                                  | Fix                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production builds reported a CSP violation on every page: Zod 4's `new Function` probe (dev allows eval, so only the full suite saw it). | `src/instrumentation-client.ts` sets `z.config({ jitless: true })` (F7.1).                                                                              |
| `--negative` in the dark theme was 4.15:1 on the tinted danger surfaces (axe, `/account/security`, user and role detail pages).          | Dark `--negative` and `--pill-negative-ink` `#e5566f` → `#f07a8d` (≥ 5.5:1 on every dark surface).                                                      |
| Tests hard-coded "Acme Portal" and `support@acme.com`, so a rebrand failed the mock suite.                                               | Tests read `brand` from `src/config/brand.ts`.                                                                                                          |
| `pnpm build` failed on Windows with `output: "standalone"` (symlinks need Developer Mode).                                               | Standalone only when `NEXT_OUTPUT=standalone` (the Dockerfile sets it) (F7.2).                                                                          |
| Two mock e2e tests were flaky under parallel load (a first-visit dev compile; Prism's random empty page).                                | Longer wait for the compiled route; the notes test checks the wiring, not random rows.                                                                  |
| The full invite test clicked "Invite user" before `/admin/users` hydrated, which the webpack build's timing exposed (3 of 5 runs).       | The test clicks until the dialog opens, as `error-pages.spec.ts` waits for hydration. The full suite then passed twice in a row in both modes (17 + 5). |

## Before tagging v0.1.0

1. Merge F7.3, F7.2, F7.1 and F7.4 (in that order, or this branch alone, which contains them).
2. Decide on the TRD 12 budget: raise it to what the stack allows (for example 200 KB gzip on the full count),
   or keep 120 KB and drop React Hook Form and TanStack Query from the public screens. Then remove
   `continue-on-error` from the budget step in `ci.yml`.
3. Decide whether FE-NFR-3 is measured over HTTP/2 (production) or the e2e stack's HTTP/1.1; this pass uses HTTP/2.
4. Run `pnpm e2e:full` against a **tagged** go-identity release (the workflow takes a ref).
5. Tag `v0.1.0`.

## How to reproduce

```sh
pnpm check && pnpm build && pnpm budget
pnpm e2e:mock
MOCK_TENANCY=multi pnpm exec playwright test --project=mock tests/e2e/mock/axe-routes.spec.ts
IDENTITY_BUILD=1 pnpm e2e:full           # needs Docker and ../go-identity
pnpm rebrand:smoke
# Lighthouse, against the e2e stack left running with E2E_KEEP=1. HTTP/1.1:
npx lighthouse@12 http://localhost:3000/sign-in --only-categories=performance --chrome-flags="--headless=new"
# HTTP/2: a TLS Caddy in front of the stack, with this Caddyfile:
#   https://localhost:8443 { tls internal
#     reverse_proxy host.docker.internal:3000 { header_up Host localhost:3000 } }
docker run -d --name lh-h2 -p 8443:8443 -v "$PWD/Caddyfile.h2:/etc/caddy/Caddyfile:ro" caddy:2-alpine
npx lighthouse@12 https://localhost:8443/sign-in --only-categories=performance   --chrome-flags="--headless=new --ignore-certificate-errors"
```
