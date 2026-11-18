# AGENTS.md — conventions for web-starter

**Before any change, read [CONTRIBUTING.md](CONTRIBUTING.md)** for where tasks and specs come from, the scope of a change, the git conventions, the PR body and the Definition of Done. This file holds the code rules for web-starter, for humans and AI agents alike. How the app fits together is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Rules for every task

1. **Read before writing:** the task's "Read first" list, then the existing code it touches. Match the surrounding style.
2. **Conventions:**
   - TypeScript strict, no `any` (use `unknown` and narrow). No default exports except where Next.js requires them (`page.tsx`, `layout.tsx`, `route.ts`, `middleware.ts`, and the other special files in `eslint.config.mjs`).
   - Server-only code (`src/lib/session`, `src/lib/bff`, `src/config/env.ts`) starts with `import "server-only"`.
   - API types come only from `src/lib/api/types.ts` (generated). Never hand-write a type for an identity payload.
   - Data fetching in client components uses TanStack Query hooks in the feature folder (`useUsers`, `useRole`). Keys come from `src/lib/api/query-keys.ts`.
   - Forms use React Hook Form + Zod; server field errors (`meta.fields`) are mapped onto the form with `applyServerErrors`.
   - All user-facing text goes through `next-intl` (`t("…")`). No string literals in JSX text (ESLint rule `react/jsx-no-literals`).
   - Styling only with Tailwind classes that use design tokens. No hex colours in components.
   - Features never import from other features (ESLint `import/no-restricted-paths`). Pages compose feature components and stay thin.
   - Files `kebab-case.ts(x)`, components `PascalCase`, hooks `useCamelCase`.
   - Never log or render tokens, cookies, passwords or emails; never put tokens in URLs (TRD 6.3, 11.1).
   - Comments describe the code, not its history (no task IDs in comments).
   - Package manager is bun only (`bun run <script>`, never `bun test`: that is Bun's own runner, not Vitest). Do not commit `pnpm-lock.yaml`, `package-lock.json` or `yarn.lock`.
3. **Never** weaken a rule from TRD 11 (security) to make a test pass.

Scope, git conventions and the Definition of Done are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Commands

| Command          | What it does                         |
| ---------------- | ------------------------------------ |
| `bun run dev`    | Dev server                           |
| `bun run check`  | Lint, typecheck, format check, tests |
| `bun run build`  | Production build (must pass in CI)   |
| `bun run format` | Prettier write                       |

## UI work

Applies to any change a user can see (new or reworked screens and components, visual identity, motion). Skip it for copy, spacing or token-value tweaks: do the browser check and nothing more.

- **Read first:** `DESIGN.md` (the visual contract) and `UI_REVIEW_WORKFLOW.md` (the process, which skill to use for which change, and the PR checklist). Do not copy their rules here or into code comments.
- **Precedence:** product requirements and the rules in this file, then `DESIGN.md`, then skill advice. Where `DESIGN.md` is blank (art direction, type, palette), propose a direction and wait for the owner; do not decide it silently or record it in `DESIGN.md` yourself.
- **Skills are optional helpers** (Frontend Design, Impeccable, Taste, Emil Kowalski, Web Interface Guidelines, UI UX Pro Max). Pick the one that fits the change; do not run them all. Their advice never overrides the conventions above: translate a suggested hex colour or text literal into a token or `t("…")`.
- **Never let a skill overwrite `DESIGN.md`.** Impeccable `init` and `document` write design files; have them write elsewhere and merge by hand.
- **Verify in a real browser** with `bun run ui:inspect <url>` (screenshots at desktop, tablet and two mobile widths, overflow, console errors, Tab order) and `bun run e2e:mock` for interactions and axe. Look at the screenshots.
- **Report honestly:** say which viewports, interactions and checks were actually run, with which tool, and what was not verified. Never claim browser verification or passing checks that did not happen.
