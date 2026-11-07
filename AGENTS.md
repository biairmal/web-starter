# AGENTS.md — conventions for web-starter

Read this before changing code. The task list is `project-files/phase2/frontend/IMPLEMENTATION_PLAN.md`; the behaviour is in `TRD.md`, the requirements in `PRD.md`, and the flows in `APP_FLOW.md`.

## Rules for every task

1. **One task = one branch = one pull request.** Branch name: `fe/<task-id>-<short-slug>`, e.g. `fe/F3.1-sign-in`.
2. **Do only what the task says.** Anything outside its "Files" list or "Out of scope" goes in a follow-up note in the PR description, not in the code.
3. **Read before writing:** the task's "Read first" list, then the existing code it touches. Match the surrounding style.
4. **Conventions:**
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
   - Package manager is pnpm only. Do not commit `package-lock.json` or `yarn.lock`.
5. **Definition of Done (every task):**
   - [ ] All "Acceptance" items pass.
   - [ ] `pnpm check` is green (lint, type check, format check, unit and component tests; `i18n:check` joins once F2.1 adds messages).
   - [ ] `pnpm e2e:mock` is green if the task adds or changes a screen (from F0.4).
   - [ ] New screens have axe checks with no critical violations (from F0.4).
   - [ ] The task's row in the **Status** table of `IMPLEMENTATION_PLAN.md` is set to ✅ in the same PR.
6. **When the TRD is unclear:** choose the simplest option consistent with the TRD, implement it, and add one line to `docs/DECISIONS.md` (`date · task · decision · reason`). Do not stop and wait.
7. **Never** weaken a rule from TRD 11 (security) to make a test pass.

## Commands

| Command       | What it does                         |
| ------------- | ------------------------------------ |
| `pnpm dev`    | Dev server                           |
| `pnpm check`  | Lint, typecheck, format check, tests |
| `pnpm build`  | Production build (must pass in CI)   |
| `pnpm format` | Prettier write                       |
