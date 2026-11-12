# Release pass v0.1.0

> **Date:** 2026-11-12 · **Branch:** `fe/F7.4-release-pass` (F7.1, F7.2 and F7.3 merged in) ·
> **identity:** go-identity `main` at `cbd2db4`, built locally as `go-identity:local`
>
> **Verdict: not ready to tag.** The PRD section 8 release criteria pass. Two plan F7.4 targets
> fail: the sign-in JavaScript budget (TRD 12) and Lighthouse performance and LCP on `/sign-in`.
> `v0.1.0` is not tagged; see "Before tagging".

## PRD section 8 release criteria

| Criterion                                               | Result   | Evidence                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every **M** requirement passes a test that names its ID | **Pass** | All 31 M IDs (FE-1…FE-10, FE-20…FE-23, FE-30…FE-32, FE-40…FE-47, FE-50, FE-51, FE-60…FE-63) appear in passing test titles. FE-23, FE-60, FE-61 and FE-63 were named in this pass (`session-provider.test.tsx`, `brand.test.ts`, new `api-types.test.ts`, new `mock-api.spec.ts`). |
| axe: no critical violation on Phase 2 screens           | **Pass** | `tests/e2e/mock/axe-routes.spec.ts`: every route in TRD 6.1, light and dark, no critical **or serious** violation (36 single-mode checks; 6 more with `MOCK_TENANCY=multi`). `/change-password` needs the restricted cookie and is checked in `change-password.spec.ts`.          |
| e2e suite passes against a real identity stack          | **Pass** | `pnpm e2e:full`, single then multi mode on fresh stacks: 17 + 5 passed, twice in a row on F7.1 and once more on this branch. Two web replicas behind Caddy throughout.                                                                                                            |
| A rebranded fresh copy passes the smoke test            | **Pass** | `pnpm rebrand:smoke`: copy renamed "Globex Hub", new support email, new `--brand-accent` (light and dark) and logos; mock suite 98 passed, 6 skipped (multi-only).                                                                                                                |

## Plan F7.4 targets

| Target                                           | Result   | Measured                                                                                                                      |
| ------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Lighthouse `/sign-in`, mobile: performance ≥ 90  | **Fail** | 83, 92, 85 (median 85). Lighthouse 12.8.2, simulated mobile throttling, production image behind Caddy, three runs.            |
| LCP < 2.5 s (mobile)                             | **Fail** | 4.4 s, 3.2 s, 4.2 s. FCP 0.9 s, TBT 130–140 ms, CLS 0. Accessibility 100, best practices 100.                                 |
| Bundle budget: sign-in JS ≤ 120 KB gzip (TRD 12) | **Fail** | 333.8 KB gzip over 24 files (`pnpm build && pnpm budget`). Next's own report: 342 kB first load, 322 kB shared by all routes. |
| Image under 200 MB (F7.2)                        | Pass     | 183 MiB (~192 MB) unpacked, 61.5 MB compressed.                                                                               |

### What the failures point at

- The LCP element is the sign-in `<h1>`, server-rendered, with ~3.9 s of render delay after a
  0.46 s TTFB. The font loads early with `display: swap`, and there are no console errors or
  hydration errors, so the delay comes from what the simulated mobile CPU and network process
  before it: the CSS, the font swap and 334 KB of JS. Lighthouse estimates 79 KiB of unused JS in
  one chunk.
- The largest chunk (94 KB gzip, 432 KB raw) contains Zod and 91 occurrences of `invalid_type`,
  which suggests Zod's locale messages are bundled, not tree-shaken. Not confirmed.
- 322 KB of the total is shared by every route (React, Next runtime, providers in the root
  layout), so the budget cannot be met by trimming the sign-in page alone.

## Found and fixed in this pass

| Finding                                                                                                                                  | Fix                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Production builds reported a CSP violation on every page: Zod 4's `new Function` probe (dev allows eval, so only the full suite saw it). | `src/instrumentation-client.ts` sets `z.config({ jitless: true })` (F7.1).                         |
| `--negative` in the dark theme was 4.15:1 on the tinted danger surfaces (axe, `/account/security`, user and role detail pages).          | Dark `--negative` and `--pill-negative-ink` `#e5566f` → `#f07a8d` (≥ 5.5:1 on every dark surface). |
| Tests hard-coded "Acme Portal" and `support@acme.com`, so a rebrand failed the mock suite.                                               | Tests read `brand` from `src/config/brand.ts`.                                                     |
| `pnpm build` failed on Windows with `output: "standalone"` (symlinks need Developer Mode).                                               | Standalone only when `NEXT_OUTPUT=standalone` (the Dockerfile sets it) (F7.2).                     |
| Two mock e2e tests were flaky under parallel load (a first-visit dev compile; Prism's random empty page).                                | Longer wait for the compiled route; the notes test checks the wiring, not random rows.             |

## Before tagging v0.1.0

1. Merge F7.3, F7.2, F7.1 and F7.4 (in that order, or this branch alone, which contains them).
2. Decide on the performance targets: bring the sign-in bundle under budget (start with the Zod
   chunk and what the root layout's providers pull into every route), then re-run Lighthouse; or
   move the budget and LCP targets to a later release in the PRD. CI reports the budget without
   blocking (`continue-on-error` in `ci.yml`) until then.
3. Run `pnpm e2e:full` against a **tagged** go-identity release (the workflow takes a ref).
4. Tag `v0.1.0`.

## How to reproduce

```sh
pnpm check && pnpm build && pnpm budget
pnpm e2e:mock
MOCK_TENANCY=multi pnpm exec playwright test --project=mock tests/e2e/mock/axe-routes.spec.ts
IDENTITY_BUILD=1 pnpm e2e:full           # needs Docker and ../go-identity
pnpm rebrand:smoke
# Lighthouse, against the e2e stack left running with E2E_KEEP=1:
npx lighthouse@12 http://localhost:3000/sign-in --only-categories=performance --chrome-flags="--headless=new"
```
