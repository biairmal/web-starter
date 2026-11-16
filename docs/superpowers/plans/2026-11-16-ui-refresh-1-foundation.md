# UI Refresh, PR 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the design tokens (tinted ground, indigo accent), restore pointer cursors and consistent interaction states, and polish the shadcn primitives, without changing any screen's behaviour.

**Architecture:** All colour comes from `src/app/tokens.css`; `globals.css` maps tokens to Tailwind names and holds one base-layer rule set for cursors. Hover, pressed and tint colours are derived from `--brand-accent` with `color-mix`, so a rebrand edits `--brand-accent` and `--brand-accent-dark` only. A unit test parses `tokens.css` and checks contrast for both themes.

**Tech Stack:** Next.js 15, Tailwind v4 (`@theme inline`), shadcn `radix-vega` with `radix-ui`, class-variance-authority, Vitest + Testing Library, Playwright + axe, Bun.

**Spec:** `docs/superpowers/specs/2026-11-16-ui-refresh-design.md` (section "PR 1: Foundation"). This is plan 1 of 3; PR 2 (table and filters) and PR 3 (shell) get their own plans.

**Branch:** `chore/ui-refresh-1-foundation`, based on `chore/ui-design-workflow` (stacked after PRs #39 and #40).

## Global Constraints

- TypeScript strict, no `any`; no hex colours in components or features (ESLint rejects them); hex lives only in `src/app/tokens.css`.
- Colour is limited to "actionable" (accent) and "status" (green, amber, red). No gradients.
- Every text and focus colour keeps at least 4.5:1 contrast (3:1 for non-text), light and dark; never lower than today.
- Default accent: `--brand-accent: #4f46e5` (light), `--brand-accent-dark: #818cf8` (dark). Rebranding changes those two values (plus `--primary-ink` if the new accent is light).
- Tinted ground `--frame: #f3f5fa`; white `--surface: #ffffff`; hairline `--border: #e3e7ef`.
- All user-facing text through `next-intl`; no new string literals in JSX.
- Pointer cursor on every clickable element; `not-allowed` on disabled ones; `a` without `href` is not a pointer.
- Keep the 120 ms press scale; respect `prefers-reduced-motion`.
- Package manager is Bun: use `bun run <script>`, never `bun test`.
- Do not change routes, data fetching, permissions or accessible names that e2e specs select by.
- Sign-in route stays within the 200 KB gzip budget (`bun run budget`).
- Each task ends with a commit. The PR description ends with the Claude Code attribution line; commits end with the `Co-Authored-By` line from the session reminder.

## Review Focus

- Dark-theme contrast of accent text, accent fill and its label (a light accent on dark is the usual failure): pinned by Task 1's both-themes contrast test.
- A disabled button, menu item or checkbox showing a pointer cursor: pinned by Task 2's base-layer test.
- An `<a>` without `href` (placeholder or in-page anchor) showing a pointer: pinned by Task 2.
- Press scale and transitions under `prefers-reduced-motion`: pinned by Task 3's button test.
- A client accent that is light (yellow) making the white button label unreadable: documented in Task 6, and pinned in Task 1 by testing that contrast is computed from the actual `--primary-ink`/`--primary` pair, so changing either fails the test.

---

### Task 1: Token contrast test and re-skinned tokens

**Files:**

- Create: `tests/helpers/tokens.ts`
- Create: `tests/unit/tokens-contrast.test.ts`
- Modify: `src/app/tokens.css`

**Interfaces:**

- Produces (`tests/helpers/tokens.ts`):
  - `readTokens(theme: "light" | "dark"): Record<string, string>`: parses `src/app/tokens.css`, applies the `:root` declarations, then (for `"dark"`) the `:root[data-theme="dark"]` ones over them, then the late `:root { --brand-accent-dark }`. Returns each token as a resolved `#rrggbb`, resolving `var(--x)` and `color-mix(in srgb, A P%, B)` (A and B are `var()` or hex; result is the sRGB blend). Tokens that are not colours (px, ms, fonts, shadows) are omitted.
  - `contrast(fg: string, bg: string): number`: WCAG 2.x contrast ratio of two `#rrggbb` colours.
- Produces tokens used by later tasks: `--primary-hover`, `--primary-press`, `--accent-shade` (new); `--primary` now `var(--brand-accent)`.

- [ ] **Step 1: Write the failing test** `tests/unit/tokens-contrast.test.ts`. One `describe.each(["light", "dark"])` block asserting `contrast(...) >= 4.5` for these pairs: `text`/`surface`, `text`/`frame`, `muted`/`surface`, `muted`/`frame`, `faint`/`surface`, `faint`/`frame`, `brand-accent`/`surface`, `brand-accent`/`frame`, `primary-ink`/`primary`, `primary-ink`/`primary-hover`, `primary-ink`/`primary-press`, `text`/`active`, plus each `pill-*-ink`/`pill-*-bg` pair. Add a unit test of `contrast("#000000", "#ffffff")` equal to 21 and of `readTokens("light")["brand-accent"]` equal to `"#4f46e5"`.
- [ ] **Step 2: Run** `bun x vitest run tests/unit/tokens-contrast.test.ts`. Expected: FAIL (helper missing).
- [ ] **Step 3: Implement** `readTokens` and `contrast` in `tests/helpers/tokens.ts` (read the CSS with `node:fs`; no new dependency).
- [ ] **Step 4: Run again.** Expected: FAIL on `brand-accent` equal to `#4f46e5` and on the missing `primary-hover` token (the helper works; the CSS has not changed).
- [ ] **Step 5: Edit `src/app/tokens.css`.** Light `:root`: `--frame #f3f5fa`, `--surface #ffffff`, `--raised #f5f6fa`, `--active color-mix(in srgb, var(--brand-accent) 10%, var(--surface))`, `--border #e3e7ef`, `--rule #eef0f5`, `--control #c3c9d6`, `--text #161b26`, `--muted #5d6677`, `--faint #656d7c`, `--primary var(--brand-accent)`, `--primary-ink #ffffff`, `--brand-accent #4f46e5`, `--accent-shade #000000`, `--primary-hover color-mix(in srgb, var(--brand-accent) 88%, var(--accent-shade))`, `--primary-press color-mix(in srgb, var(--brand-accent) 76%, var(--accent-shade))`, `--chart-1 var(--brand-accent)`. Dark block: `--frame #0d0f14`, `--surface #161920`, `--raised #1e222b`, `--active color-mix(in srgb, var(--brand-accent) 18%, var(--surface))`, `--border #2a2f3a`, `--rule #222732`, `--control #4a5262`, `--text #f4f5f8`, `--muted #b0b6c3`, `--faint #9299a8`, `--primary-ink #0f1115`, `--accent-shade #ffffff`; delete its `--primary` and `--chart-1` overrides; `--brand-accent-dark #818cf8`. Keep status, pill, layout, radius and motion tokens. If a pair fails, nudge that token's lightness only, keep its hue, and note the final value in the commit message.
- [ ] **Step 6: Run** the test. Expected: PASS.
- [ ] **Step 7: Commit** `tests/helpers/tokens.ts tests/unit/tokens-contrast.test.ts src/app/tokens.css` ("Re-skin tokens: tinted ground, indigo accent").

### Task 2: Tailwind token mapping and the base interaction layer

**Files:**

- Modify: `src/app/globals.css`
- Create: `tests/unit/interaction-base.test.ts`

**Interfaces:**

- Consumes: Task 1 tokens.
- Produces: Tailwind colour utilities `bg-primary-hover`, `bg-primary-press`; a base-layer cursor rule set.

- [ ] **Step 1: Write the failing test** `tests/unit/interaction-base.test.ts`, reading `src/app/globals.css` as text. Tests: (a) the `@layer base` block contains `cursor: pointer` for selectors `button`, `a[href]`, `summary`, `[role="menuitem"]`, `[role="tab"]`, `[role="option"]`, `select`, `[role="switch"]`; (b) it uses `a[href]` and never a bare `a` selector; (c) a `cursor: not-allowed` rule for `:disabled`, `[aria-disabled="true"]` and `[data-disabled]` appears **after** the pointer rule; (d) no file in `src/components/ui/*.tsx` contains `cursor-default` (read with `node:fs`); (e) `globals.css` maps `--color-primary-hover` to `var(--primary-hover)` and `--color-primary-press` to `var(--primary-press)`.
- [ ] **Step 2: Run** `bun x vitest run tests/unit/interaction-base.test.ts`. Expected: FAIL.
- [ ] **Step 3: In `globals.css`**, add the two `--color-primary-*` mappings in `@theme inline`; in `@layer base` add the pointer rule (interactive selectors above, each guarded with `:not(:disabled)` or `:not([aria-disabled="true"])` where applicable) followed by the `not-allowed` rule. Keep the existing base rules.
- [ ] **Step 4: Remove `cursor-default`** from every class string in `src/components/ui/*.tsx` (dropdown-menu items, select items, tooltip, etc.) so the base rule applies; do not replace it with `cursor-pointer`.
- [ ] **Step 5: Run** the test. Expected: PASS.
- [ ] **Step 6: Commit** ("Pointer cursor and disabled cursor in the base layer").

### Task 3: Button

**Files:**

- Modify: `src/components/ui/button.tsx`
- Modify: `tests/component/button.test.tsx`

**Interfaces:**

- Consumes: `bg-primary-hover`, `bg-primary-press` (Task 2).
- Produces: unchanged `Button` and `buttonVariants` API (no new props; the pending state stays in `SubmitButton`).

- [ ] **Step 1: Extend `tests/component/button.test.tsx`** with: the default variant's `className` contains `hover:bg-primary-hover` and `active:bg-primary-press` and not `hover:bg-primary/80`; the base classes contain `motion-reduce:transition-none` and `motion-reduce:active:scale-100`; the `link` variant uses `text-brand-accent`; the `destructive` variant still contains `text-destructive`; `<Button disabled>` renders a disabled button.
- [ ] **Step 2: Run** `bun x vitest run tests/component/button.test.tsx`. Expected: FAIL on the new assertions.
- [ ] **Step 3: Edit `buttonVariants`:** default `bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-press`; add the two `motion-reduce` classes to the base; `link` uses `text-brand-accent`; `outline` and `secondary` get a visible but quiet hover (`hover:bg-muted` / `hover:bg-accent`) and keep `aria-expanded` styles; leave sizes and focus ring (`ring-ring/50`, now accent) as they are.
- [ ] **Step 4: Run** the test and `bun x vitest run tests/component`. Expected: PASS.
- [ ] **Step 5: Commit** ("Button: accent fill, hover and pressed states, reduced motion").

### Task 4: Form controls

**Files:**

- Modify: `src/components/ui/input.tsx`, `src/components/ui/select.tsx`, `src/components/ui/checkbox.tsx`, `src/components/ui/label.tsx`
- Create: `tests/component/ui-primitives.test.tsx`

**Interfaces:**

- Consumes: Task 2 tokens and cursor layer. Produces: unchanged component APIs.

- [ ] **Step 1: Write the failing tests** in `tests/component/ui-primitives.test.tsx`: `Input` className contains `hover:border-faint` and `focus-visible:ring-3`; `Input disabled` keeps `disabled:cursor-not-allowed`; the `SelectTrigger` className contains `hover:border-faint`; `Checkbox` className contains `data-checked:bg-primary` and a `focus-visible:ring-3`; a `Label` wrapping a checkbox renders without a cursor class that overrides the base layer (assert no `cursor-default`).
- [ ] **Step 2: Run** `bun x vitest run tests/component/ui-primitives.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Add `hover:border-faint`** (not on disabled) to the input and select trigger; make input and select backgrounds `bg-surface`-equivalent (`bg-background`) in light, keep the `dark:` tints; ensure the checked checkbox and focus rings use the accent via existing `primary` and `ring` tokens.
- [ ] **Step 4: Run** the new tests and `bun run test`. Expected: PASS.
- [ ] **Step 5: Commit** ("Form controls: hover border and accent focus").

### Task 5: Menus, overlays, badge

**Files:**

- Modify: `src/components/ui/dropdown-menu.tsx`, `dialog.tsx`, `sheet.tsx`, `tooltip.tsx`, `badge.tsx`, `skeleton.tsx`, `sonner.tsx`
- Modify: `tests/component/ui-primitives.test.tsx`

**Interfaces:**

- Consumes: Task 2 tokens. Produces: unchanged APIs.

- [ ] **Step 1: Add failing tests:** `DropdownMenuItem` className contains `focus:bg-accent` and no `cursor-default`; the dialog and sheet close buttons (rendered via `DialogContent`/`SheetContent` in a test) have accessible name unchanged and a visible `focus-visible:ring`; `Badge` default variant uses a token class (assert no `#` hex and a `bg-` token); `Skeleton` has `animate-pulse` and `motion-reduce:animate-none`.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Restyle for consistency:** menu items hover/focus use the accent tint (`focus:bg-accent`); floating surfaces (menu, dialog, sheet, tooltip, toast) use `border` + `shadow-float` and `bg-popover`; dialog and sheet overlays keep their existing opacity; the toast uses status tokens for success and error; `Skeleton` gets `motion-reduce:animate-none`. No new dependencies.
- [ ] **Step 4: Run** `bun run test`. Expected: PASS.
- [ ] **Step 5: Commit** ("Menus and overlays: tinted hover, floating surfaces, reduced motion").

### Task 6: DESIGN.md, rebrand note and decision log

**Files:**

- Modify: `DESIGN.md` (sections 1, 2, 4, 6), `docs/DECISIONS.md`

- [ ] **Step 1: In `DESIGN.md`** fill the Colour table from the new tokens (Primary `--primary` = accent; Accent `--brand-accent`; Background `--frame`; Surface `--surface`; Text; Muted; Border; Success/Warning/Danger; Focus = `--ring` = accent); fill section 2 (direction, Stripe reference and what is borrowed, motif: none) from the approved spec; add section 6 hover, pressed and disabled rules (press scale 120 ms, pointer and not-allowed cursors); replace the "visual direction is not yet decided" status note with "approved 2026-11-16, see the UI refresh design doc".
- [ ] **Step 2: Add a "Rebranding the accent" subsection** to section 4: change `--brand-accent` and `--brand-accent-dark`; if the new accent is light, also set `--primary-ink`; run `bun x vitest run tests/unit/tokens-contrast.test.ts` and keep it green.
- [ ] **Step 3: Append one row to `docs/DECISIONS.md`** (`2026-11-16 | chore | UI refresh PR 1: ...`) covering: indigo default, derived hover/press/tint via `color-mix`, base-layer cursors, Button keeps pending state in `SubmitButton`.
- [ ] **Step 4: Run** `bun x prettier --write DESIGN.md docs/DECISIONS.md` then `bun run format:check`. Expected: PASS.
- [ ] **Step 5: Commit** ("Document the new tokens and rebranding").

### Task 7: Screenshots, full verification, PR

**Files:**

- Create: `tests/e2e/mock/ui-snapshots.spec.ts`

- [ ] **Step 1: Before set.** On the base branch (`chore/ui-design-workflow`), start the app (`bun run dev`, or the mock stack) and run `bun run ui:inspect /sign-in /forgot-password`; move `.ui-review/` to `.ui-review-before/` (git-ignored via a pattern added to `.gitignore`: `/.ui-review*`).
- [ ] **Step 2: Write `tests/e2e/mock/ui-snapshots.spec.ts`**, skipped unless `UI_SNAPSHOTS=1`, that signs in with the existing mock helpers and saves full-page screenshots of `/`, `/admin/users`, `/admin/roles`, `/admin/audit` at 1440×900 and 390×844 in light and dark to `.ui-review/`. Each test name begins `UI snapshot:`.
- [ ] **Step 3: After set.** On the new branch, run `bun run ui:inspect /sign-in /forgot-password` and `UI_SNAPSHOTS=1 bun run e2e:mock --grep "UI snapshot"`. Look at the images. Expected: tinted ground, indigo primary buttons, pointer cursors (verified by hovering manually or with Playwright `evaluate(getComputedStyle(...).cursor)` in the spec: assert `pointer` for the primary button and `not-allowed` for a disabled one).
- [ ] **Step 4: Run** `bun run check`, `bun run e2e:mock` (axe passes in both themes), `bun run build`, `bun run budget`. Expected: all green; state anything not run.
- [ ] **Step 5: Open the PR** (draft, base `chore/ui-design-workflow`) titled "UI refresh 1/3: tokens, interaction base, primitives", with before/after screenshots, the contrast results, and the unverified items. Commit the spec file first.

---

## Self-review notes

- **Spec coverage:** tokens (Task 1), cursor and interaction base (Task 2), primitives (Tasks 3 to 5), `DESIGN.md` sections 1, 2, 4 and 6 (Task 6), screenshots and checks (Task 7). **One deviation from the spec:** the spec says "add a loading state to Button". `SubmitButton` already provides the pending state (spinner, `aria-busy`, stable width), so a second one would duplicate it; this plan adds no new prop and records the decision in Task 6.
- **Not in this PR:** table, filters, shell, public pages' layout (PRs 2 and 3), `popover` (added in PR 2 when first used).
- **Consistency:** token names `--primary-hover`, `--primary-press`, `--accent-shade` and utilities `bg-primary-hover`, `bg-primary-press` are used identically in Tasks 1 to 3.
