# UI refresh: design

Status: draft for owner approval. Date: 2026-11-16.

## Intent and why

The starter works but feels unpolished and gloomy. The owner's complaints, in their words: a button has no pointer cursor; the colour is neutral to the point of being gloomy ("give some accent colour"); and the components are not good: the shadcn primitives feel unfinished, and the table, the filter components and the app shell are not proper components.

The goal is a starter that looks and feels professionally finished out of the box, in a restrained Stripe-like style, while staying a white-label template: a client rebrands by changing one accent colour (and the logo and name), nothing more.

## Decisions the owner made

- **Reference:** Stripe, but "not too colorful".
- **Colour direction A, "tinted ground, indigo accent":** a soft blue-grey ground (`~#f3f5fa`), a white sheet with a hairline border, and indigo (`~#4f46e5`) used only on things you can act on: the primary button, the active nav item, selected filters and links. Status pills keep their own green, amber and red tints. Indigo is the default only; rebranding stays "change the accent token".
- **Filters: inline pills.** Every applied filter is a removable pill beside the search box, with "+ Add filter" and "Clear all". "+ Add filter" opens a popover on desktop and a bottom sheet on mobile, the same on every list.
- **Layout stays unless it must change.** The sidebar plus white sheet shell is kept. The owner allowed a full rebuild "only if we have to".
- **Delivery: three layered PRs** (below), not one big one and not wholesale shadcn blocks.

## Goals

1. Every clickable element shows a pointer cursor, and every interactive component has consistent hover, pressed, focus-visible, disabled and loading states.
2. One accent system: a single accent token (plus its dark-mode variant) drives the primary button, active nav, selection, links and focus ring. A tinted ground and sheet replace the grey-on-grey look.
3. The table, filter bar and shell are real, reusable components with a clear API, not per-feature one-offs.
4. Light and dark themes both look finished.
5. No change to routes, data fetching, permissions or the behaviour the existing e2e suite checks.

## Non-goals

- New features or screens, new routes, API changes.
- Changing the information architecture, nav items or permissions.
- Wholesale replacement of the shell with shadcn's sidebar block.
- Choosing a brand identity: the indigo is a default for the template, not a brand.
- A new font. Type changes are limited to scale, weight and tabular numerals unless the owner asks for more.

## Anti-goals (failure even if it technically works)

- Colourful or gradient-heavy UI. Colour appears only where it means "actionable" or "status".
- A rebrand that needs more than one accent token to change.
- Lower contrast or weaker focus than today. Every text and focus colour must keep at least 4.5:1 (3:1 for non-text), light and dark.
- Breaking any rule in `AGENTS.md`: tokens only (no hex in components), all text through `next-intl`, no feature-to-feature imports.
- Regressing the 200 KB sign-in JavaScript budget (`bun run budget`).

## Constraints

- Stack as is: Next.js 15, Tailwind v4, shadcn style `radix-vega` with `radix-ui`, TanStack Table and Query, `next-intl`, Bun.
- Tokens live in `src/app/tokens.css` and are mapped in `src/app/globals.css`. The earlier brief (`project-files/phase2/frontend/DESIGN_BRIEF.md`) is superseded where this document differs; `DESIGN.md` records the new decisions.
- Shared components go in `src/components/`, because features may not import each other. The existing `user-filters.tsx` and `audit-filters.tsx` are the two feature-level filter UIs to be replaced.
- Each PR must meet the `AGENTS.md` definition of done: `bun run check`, `bun run e2e:mock` and axe checks green, and a before/after screenshot set from `bun run ui:inspect`.
- Existing e2e tests select by role and name; keep accessible names stable or update the tests in the same PR with a reason.

## Approaches considered

1. **Layered, three PRs (chosen).** Tokens and primitives, then table and filters, then shell. Reviewable and mergeable piece by piece; the app is never half-restyled. Slowest overall.
2. **One big PR.** Fastest to write; unreviewable, and any bug blocks everything. Rejected.
3. **Adopt shadcn's sidebar and data-table blocks wholesale.** Gives "real shadcn" components but rewrites a working shell, adds a lot of code and fights the token system. Rejected, except that missing primitives (popover, command menu if needed) are added with the shadcn CLI.

## Design

### PR 1: Foundation

- **Tokens.** Re-skin `tokens.css` (light and dark): tinted ground for the frame, white surface, hairline borders, indigo `--brand-accent` (light) and `--brand-accent-dark` (dark), as the template has today, and nothing else brand-specific. The hover, pressed and tint colours are **derived** from those with `color-mix`, so a client edits only those two values. The default indigo is guaranteed 4.5:1 for text and 3:1 for focus and borders, with a unit test that checks it. For any other accent, `docs/` gets a short rebrand note saying how to check contrast; there is no automatic enforcement. Status tokens are kept. The primary button becomes the accent fill.
- **Interaction base.** In `globals.css` `@layer base`, restore `cursor: pointer` for `button`, `[role="button"]`, `a[href]`, `summary`, `select`, `input[type="checkbox"|"radio"|"submit"]`, and `[role="menuitem"|"tab"|"option"]`, with `cursor: not-allowed` for disabled ones. Replace per-component `cursor-default` on menu items. Add a consistent focus ring from the accent token.
- **Primitives.** Polish `button`, `input`, `select`, `checkbox`, `badge`, `dialog`, `dropdown-menu`, `sheet`, `tooltip`, `skeleton`, `sonner`: consistent heights and radii, hover, pressed (existing 120 ms press scale kept), focus-visible, disabled, loading. Add a loading state to `Button`. Add `popover` via the shadcn CLI for PR 2.
- **Docs.** Update `DESIGN.md` sections 1, 2, 4, 6 with these decisions and fill the token tables from the new tokens.

### PR 2: Table and filters

- **`DataTable`.** Sticky header, sortable header affordance (arrow and `aria-sort`), row hover, selected-row state, tabular numerals, comfortable and compact density from tokens, a row-actions cell (`⋯` menu revealed on hover and always on touch and keyboard focus), loading skeleton rows, empty and error states using the existing feedback components, pagination footer inside the sheet. Mobile keeps the card layout.
- **`FilterBar`** (new, `src/components/filters/`): a search box plus a typed list of filter definitions, rendering removable pills, "+ Add filter", and "Clear all". Filter types are only what the data layer supports today: `select` (static or fetched options), `typeahead` (Audit's actor), and `date` (Audit's dates). Each filter holds one string value, as `use-list-params` does now, so **`use-list-params` and the API are not changed**. State stays in the URL. The inline-versus-menu rule depends on viewport only, never on the number of filters: pills are always inline; "+ Add filter" and each pill's value editor open in a popover from `sm` (640 px) up and in a bottom sheet below it. Users and Audit use the same pattern. Keyboard operable: pill removal, the add-filter menu, and focus returning to the trigger.
- **Roll-out.** All six tables already share one `DataTable`, which takes a `mobileCard` prop and renders the card layout itself (server-side paging and sorting). Keep that API; add row actions, density and states to it. Replace `user-filters.tsx` and `audit-filters.tsx` with `FilterBar` configs, and adopt the new look in Users, Roles, Role templates, Audit, Notes and Tenants.
- **Tests.** The filter e2e specs may be rewritten in this PR for the new pills and menu, with the reason in the PR. The search box keeps its accessible name; table behaviour specs stay as they are.

### PR 3: Shell

- Keep the layout (sidebar, top bar, white sheet). Restyle `sidebar.tsx` (grouped sections, accent active item, hover, collapsible on mobile drawer as today), `top-bar.tsx`, `user-menu.tsx`, `tenant-switcher.tsx`, `language-switcher.tsx`, and `public-frame.tsx` (sign-in and other public pages get the same ground and accent). Page header pattern (title, description, primary action) as a shared component if three or more pages repeat it.
- Re-evaluate the shell layout at the start of this PR with real screenshots at 1440, 768, 390 and 320 wide. A "concrete problem" means a failed accessibility, mobile-usability or density check, written up in the PR. Fixing it within the same structure goes ahead; a bigger rebuild needs the owner's sign-off before any code. Breakpoints stay as today (`lg` 1024 px for the sidebar, `sm` 640 px for the sheet and cards).

## What is left to the builder

Exact colour values and ramps (checked for contrast), exact component props, whether a shared page-header component earns its place, density defaults, icon choices (lucide), and the visual regression approach beyond `ui:inspect` screenshots.

## Sequencing and naming

The three PRs are stacked in order: each is based on the previous, so PR 2 can rely on PR 1's tokens. They follow the open PRs #39 (Bun) and #40 (UI workflow files). Branches: `chore/ui-refresh-1-foundation`, `chore/ui-refresh-2-table-filters`, `chore/ui-refresh-3-shell`. This work is outside the numbered frontend task plan, so there are no task IDs or Status rows; each PR adds a line to `docs/DECISIONS.md` instead.

## How each PR is verified

`bun run check`; `bun run e2e:mock` (with axe) green, including both themes; keyboard pass over the new components; `bun run budget` for the sign-in route. Screenshots: `bun run ui:inspect` captures static pages behind the sign-in at 1440, 768, 390 and 320 wide. It cannot capture hover, open menus or loading, empty and error states, so those are captured by `page.screenshot` calls in the PR's e2e specs. Extending `ui:inspect` is out of scope. Before/after sets are attached to each PR. Anything not run is stated in the PR.

## Defaults I am starting with (owner can change)

- Indigo `#4f46e5` as the template's default accent. A different hue later only changes the two token values.
- The existing wordmark and logo mark stay, and are checked against the new tinted ground on the sidebar and sign-in page.
