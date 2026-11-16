# UI Refresh, PR 3: Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the look of the app frame: a shared page header, a polished sidebar, top bar and menus, a framed sign-in screen, and status-coloured toasts, keeping the shell's layout unless a concrete problem is found.

**Architecture:** Changes are mostly class-level restyling on tokens already in place (PR 1) plus one new shared server component, `PageHeader`, that replaces the title, description and action markup repeated on the list and account pages. The sign-in route stays server-rendered with no added client code. A review gate with real screenshots at four widths decides whether any layout change is justified.

**Tech Stack:** Next.js 15 (server components), Tailwind v4 tokens, shadcn `radix-vega`, next-intl, Sonner, Vitest + Testing Library, Playwright + axe, Bun.

**Spec:** `docs/superpowers/specs/2026-11-16-ui-refresh-design.md` (section "PR 3: Shell"). Plan 3 of 3. PRs 1 and 2 are beneath this branch.

**Branch:** `chore/ui-refresh-3-shell`, based on `chore/ui-refresh-2-table-filters`.

**Already done on this branch:** the example logo (commit `78fdc9e`): an indigo rounded-square mark with a white arch, and a monoline "ACME" wordmark drawn from paths, in light and dark versions with explicit colours (the old placeholder used `currentColor`, which is black inside an `<img>`, so it vanished on the dark theme). `public/brand/logo.svg`, `logo-dark.svg`, `mark.svg`. Not in this plan.

## Global Constraints

- TypeScript strict, no `any`; no hex colours in components or features (hex only in `src/app/tokens.css` and the SVG assets in `public/brand/`); Tailwind arbitrary values are banned by lint, so add a named `@utility` in `globals.css` when one is needed.
- All user-facing text through `next-intl`, keys in **both** `messages/en.json` and `messages/id.json` (`bun run i18n:check`).
- Features never import other features; `src/components` never imports `src/features`.
- Layout stays: sidebar 228px (`--sidebar-width`) from 1024px (`lg`), a 48px top bar and left drawer below it, the white sheet inset from the window from 640px (`sm`). Change it only through Task 7's gate.
- **The sign-in route stays within 200 KB gzip** (`bun run budget`): `PublicFrame`, `Wordmark`, `ErrorPageBody` and `PageHeader` remain server components with no `"use client"` and no new dependency.
- One `<h1>` per page, no skipped heading levels; accessible names of nav links, menus and buttons do not change (e2e selects by them).
- Pointer cursors come from the base layer; components set no `cursor-*`. Motion respects `prefers-reduced-motion`.
- Contrast stays at least 4.5:1 for text and 3:1 for icons and borders, light and dark (`tests/unit/tokens-contrast.test.ts` keeps passing).
- Package manager is Bun: `bun run <script>`, never `bun test`. Commits end with the `Co-Authored-By` line from the session reminder.
- `bun run check`, `bun run e2e:mock` (restart the stateful mock identity first) and `bun run budget` stay green.

## Review Focus

- The sign-in page's JavaScript must not grow: no client component may enter `PublicFrame`. Pinned in Task 5 (budget) and Task 7.
- The logo must be visible in both themes: the light logo hides on dark and the dark logo shows, and a coloured background is never behind an invisible mark. Pinned in Task 5 with a real-browser check per colour scheme.
- A 60-character tenant name or person name must truncate in the sidebar and user menu without horizontal scroll at 320 px. Pinned in Task 4.
- A page header with a long title and an action must wrap cleanly at 320 px. Pinned in Task 1.
- Every page keeps exactly one `<h1>` after adopting `PageHeader`. Pinned in Tasks 1 and 2.

---

### Task 1: `PageHeader`

**Files:**

- Create: `src/components/layout/page-header.tsx`
- Test: `tests/component/page-header.test.tsx`

**Interfaces:**

- Produces: `PageHeader({ title, description, action, className }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string })`, a server-compatible component (no hooks, no `"use client"`). Renders `<div class="flex flex-wrap items-start justify-between gap-4">` holding a column with the `<h1>` (`text-title font-semibold`) and an optional `<p>` (`text-body text-muted-foreground`), and the `action` on the end side. The title text wraps (`min-w-0 break-words`).

- [ ] **Step 1: Write failing tests:** it renders exactly one heading of level 1 with the title; the description is a paragraph after it and is omitted when not given; an `action` renders in the same row as a sibling of the text column; with a 120-character unbroken title the `h1` has `break-words` and its column `min-w-0` **(Review Focus 4)**; the root has no `cursor-` class.
- [ ] **Step 2: Run** `bun x vitest run tests/component/page-header.test.tsx`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `PageHeader` as specified.
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Commit** ("Add PageHeader").

### Task 2: Adopt `PageHeader`

**Files:**

- Modify: `src/app/(app)/admin/users/page.tsx`, `admin/roles/page.tsx`, `admin/role-templates/page.tsx`, `admin/tenants/page.tsx`, `admin/audit/page.tsx`, `notes/page.tsx`, `account/page.tsx`, `account/security/page.tsx`, `page.tsx` (home), all under `src/app/(app)/`

**Interfaces:** Consumes `PageHeader` (Task 1). The detail screens (`user-detail`, `tenant-detail`, `role-editor`) keep their own headers: they carry a back link and status, not the title, description and action pattern.

- [ ] **Step 1: Write the failing check:** `tests/unit/page-header-adoption.test.ts` reads each file above and asserts it imports `PageHeader` from `@/components/layout/page-header` and contains no `<h1 className="text-title font-semibold">` literal (**Review Focus 5**: the single `h1` now comes from `PageHeader`).
- [ ] **Step 2: Run** `bun x vitest run tests/unit/page-header-adoption.test.ts`. Expected: FAIL for every listed page.
- [ ] **Step 3: Replace** each page's title, description and action block with `<PageHeader title description action />`, keeping every existing translation key and the action's permission gating (for example `can(me, USERS_MANAGE) && <InviteDialog />`).
- [ ] **Step 4: Run** the check, `bun run typecheck`, and the e2e specs for the touched pages (`admin-users`, `admin-roles`, `audit`, `notes`, `account`, `security`, `shell`, `tenants`). Expected: PASS.
- [ ] **Step 5: Commit** ("Pages use PageHeader").

### Task 3: Sidebar and top bar

**Files:**

- Modify: `src/components/layout/sidebar.tsx`, `src/components/layout/top-bar.tsx`
- Test: `tests/component/sidebar.test.tsx` (extend or create)

**Interfaces:** `navSections`, `isActivePath`, `SidebarContent` and `TopBar` keep their exports and props.

- [ ] **Step 1: Write failing tests:** the active link has `aria-current="page"` and its icon carries `text-brand-accent`; an inactive link's icon is `text-faint` and turns `text-foreground` on hover (`group-hover` classes present); group headings keep `text-faint` and are `h2`; the links keep their accessible names; the top bar's menu button keeps its name `Open menu`; the drawer content is the same `SidebarContent`.
- [ ] **Step 2: Run** the file. Expected: FAIL on the icon colour assertions.
- [ ] **Step 3: Restyle:** nav links get `group` and icon colours as above; active keeps `bg-active` and the 2px accent marker; spacing between sections from the nav tokens; the top bar's wordmark and menu button align on the same 48px row with a `shadow-rule-inset` bottom rule below `lg` only if screenshots in Task 7 show the bar blends into the sheet (decide there, not here).
- [ ] **Step 4: Run** the file and `bun run test`. Expected: PASS.
- [ ] **Step 5: Commit** ("Sidebar: accent icon on the active item, hover states").

### Task 4: Tenant switcher, user menu, language switcher

**Files:**

- Modify: `src/components/layout/tenant-switcher.tsx`, `user-menu.tsx`, `language-switcher.tsx`
- Test: `tests/component/tenant-switcher.test.tsx` (extend), `tests/component/user-menu.test.tsx` (create if absent)

**Interfaces:** props and accessible names unchanged.

- [ ] **Step 1: Write failing tests:** the tenant switcher's trigger has a visible boundary (`border` and `bg-background`) so it reads as a control; a 60-character tenant name renders inside a `truncate` element with a `title` **(Review Focus 3)**; the user menu trigger truncates a 60-character display name and shows the initials avatar; both triggers keep `focus-visible:ring-2` and set no `cursor-`; menu items use the shared `DropdownMenuItem`.
- [ ] **Step 2: Run** the files. Expected: FAIL on the new assertions.
- [ ] **Step 3: Restyle** the tenant switcher trigger as a bordered control (height `h-nav-row`, `rounded-md`, `border border-border bg-background hover:border-faint`), keep the single-tenant mode showing no switcher as today; keep the user row at the bottom of the sidebar with the avatar tinted `bg-active`; language switcher trigger gets the same hover and focus treatment as ghost buttons.
- [ ] **Step 4: Run** the files and `bun run test`. Expected: PASS.
- [ ] **Step 5: Commit** ("Tenant switcher, user menu, language switcher: clearer controls").

### Task 5: Public frame and error pages

**Files:**

- Modify: `src/components/layout/public-frame.tsx`, `src/app/global-error.tsx`
- Test: `tests/component/public-frame.test.tsx` (create or extend), `tests/e2e/mock/ui-snapshots.spec.ts`

**Interfaces:** `PublicFrame` and `ErrorPageBody` keep their props. They stay server components.

- [ ] **Step 1: Write failing tests:** `PublicFrame` renders the wordmark and the children inside one panel with classes `rounded-xl border border-border bg-background` (a white card on the tinted ground; the design brief's earlier "no card" rule is replaced, recorded in Task 7); the support and legal footer stays outside the card; the file does not contain `"use client"` **(Review Focus 1)**; `global-error.tsx`'s primary button has `hover:` and `active:` classes. In `ui-snapshots.spec.ts` add a browser test per colour scheme (light, dark) on `/sign-in`: the visible logo `img` (the one whose computed `display` is not `none`) has a non-zero rendered size, and exactly one logo image is displayed **(Review Focus 2)**.
- [ ] **Step 2: Run** the component test and the browser test. Expected: FAIL (no card, no hover classes).
- [ ] **Step 3: Implement** the card (padding `p-8`, narrow viewports `p-6`; the 400px column and vertical placement stay), the hover and pressed states on the error page's button, and nothing else.
- [ ] **Step 4: Run** both tests, the whole `axe-routes` e2e spec (public routes in both themes), and `bun run build` then `bun run budget` (with the dev server stopped). Expected: PASS and the sign-in route at most 200 KB gzip.
- [ ] **Step 5: Commit** ("Sign-in frame as a card; error page button states").

### Task 6: Toasts

**Files:**

- Modify: `src/components/ui/sonner.tsx`
- Test: `tests/component/ui-primitives.test.tsx`

**Interfaces:** `Toaster` keeps its props.

- [ ] **Step 1: Write failing test:** the `Toaster` passes `toastOptions.classNames` with token-based classes for `success` and `error` (for example `text-positive` and `text-negative` on the icon) and no hex colours; it keeps `shadow-float` and the hairline ring.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the class mapping using the status tokens; keep the icons and the `--normal-*` variables.
- [ ] **Step 4: Run** `bun run test`. Expected: PASS.
- [ ] **Step 5: Commit** ("Toasts use the status tokens").

### Task 7: Layout gate, docs, verification, PR

**Files:**

- Modify: `DESIGN.md` (sections 5 and 4 spacing), `docs/DECISIONS.md`

- [ ] **Step 1: Layout gate.** With the stack running, capture the shell pages (home, users, roles, audit, account) at 1440×900, 1024×768, 768×1024, 390×844 and 320×640, light and dark, into `.ui-review/pr3-after`; capture the same on the PR 2 tip into `.ui-review/pr3-before`. Look at every image. For each of accessibility, mobile usability and density, write one line saying whether the shell has a concrete problem. If none, record "layout unchanged" and stop. If one exists and the fix fits the current structure, make it in a new commit; a larger rebuild is **not** done here and goes to the owner first.
- [ ] **Step 2: Document** in `DESIGN.md` section 5: page shell, navigation pattern, content width, responsive navigation, the page header pattern, the sign-in card; and fill the spacing table from the tokens in use. Add one `DECISIONS.md` row (shared `PageHeader`; sign-in card replaces the earlier "no card" rule; tenant switcher as a bordered control; layout unchanged or changed, with the reason; toasts use status tokens).
- [ ] **Step 3: Verify:** `bun run check`; restart the mock identity, then `bun run e2e:mock` (axe passes in both themes); stop the dev server, `bun run build` and `bun run budget`; `bun run ui:inspect` on `/sign-in` at 320 px with no horizontal overflow.
- [ ] **Step 4: Open the draft PR** (base `chore/ui-refresh-2-table-filters`) titled "UI refresh 3/3: shell, sign-in and logo", with before and after screenshots, what was not verified, and the deferred minors from PRs 1 and 2 that touch the shell.

---

## Self-review notes

- **Spec coverage:** sidebar, top bar, user menu, tenant switcher, language switcher, public frame → Tasks 3 to 5; shared page header (three or more pages repeat it) → Tasks 1 and 2; "re-evaluate the layout with screenshots at 1440, 768, 390 and 320; change only for a concrete problem" → Task 7 step 1; toasts using status tokens (deferred from PR 1) → Task 6; `DESIGN.md` section 5 and spacing → Task 7.
- **Calls for the owner to confirm:** (1) the sign-in screen becomes a white card on the tinted ground (the old brief said "no card"); (2) the tenant switcher becomes a bordered control so it looks clickable; (3) layout stays as it is unless Task 7's review finds a concrete problem.
- **Not in this PR:** the logo (done, `78fdc9e`), a favicon from the new mark (`src/app/favicon.ico` still the old one; say so in the PR), any change to routes, permissions or data.
- **Consistency:** `PageHeader`, `SidebarContent`, `navSections`, `isActivePath`, `PublicFrame`, `ErrorPageBody` and `Wordmark` are named identically in every task.
