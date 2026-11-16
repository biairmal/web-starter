# UI Refresh, PR 2: Table and Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every list a proper, shared table and a filter bar with removable pills, replacing the hand-built per-feature filter UIs, without changing what a list does.

**Architecture:** A new `FilterBar` in `src/components/filters/` takes a search box and typed filter definitions and renders removable pills, "+ Add filter" and "Clear filters". Values stay in the URL through the existing `useListParams` (one string per key, unchanged). Editors open in a popover from 640 px up and a bottom sheet below. `DataTable` keeps its API and gains hover-revealed row actions, a clearer sort affordance and density. Features supply filter definitions; they never import each other.

**Tech Stack:** Next.js 15, React 19, Tailwind v4, shadcn `radix-vega` (`radix-ui` Popover, Dialog/Sheet), TanStack Table, next-intl, Vitest + Testing Library, Playwright + axe, Bun.

**Spec:** `docs/superpowers/specs/2026-11-16-ui-refresh-design.md` (section "PR 2: Table and filters"). Plan 2 of 3; PR 1 (tokens, interaction base) is merged or stacked beneath this branch.

**Branch:** `chore/ui-refresh-2-table-filters`, based on `chore/ui-refresh-1-foundation`.

## Global Constraints

- TypeScript strict, no `any`; no hex colours in components or features; tokens only (Tailwind token classes).
- All user-facing text through `next-intl` with keys added to **both** `messages/en.json` and `messages/id.json` (`bun run i18n:check` enforces it). No string literals in JSX text (`react/jsx-no-literals`).
- Features never import other features. Shared code lives in `src/components/`; `src/components/` never imports from `src/features/`.
- Filter state is `Record<string, string>` in the URL via `useListParams`; **do not change `use-list-params.ts`, the API types or the data layer.**
- Filter types are only: `select`, `date`, `custom` (audit's actor). No multi-select, no date-range type (two `date` filters, `from` and `to`).
- Popover from `sm` (640 px) up, bottom sheet below. Same on every list. The inline pills are always visible.
- Keep the existing visible strings where tests select by them: the search box accessible names ("Search by name or exact email", "Search roles", "Search by name or slug", "Search title or text") and the button name "Clear filters".
- Pointer cursor comes from the base layer; components set no `cursor-*`. Motion respects `prefers-reduced-motion`.
- Accessible names of rows, pagination and the sort buttons do not change.
- Package manager is Bun: `bun run <script>`, never `bun test`. Commits end with the `Co-Authored-By` line from the session reminder.
- `bun run check`, `bun run e2e:mock` (restart the stateful mock identity first) and `bun run budget` stay green.

## Review Focus

- A filter value in the URL that matches no option (a deleted role id in `?role=`): the pill must show the raw value and stay removable, never blank or crash. Pinned in Task 2.
- Removing a pill or closing an editor must not drop focus to `<body>`: it returns to the next pill, else "+ Add filter". Pinned in Task 3.
- Escape and selecting an option close the popover or sheet and return focus to the trigger; the sheet traps focus. Pinned in Task 3.
- A date filter must not let `from` exceed `to` (the editor sets `min`/`max` from the other value). Pinned in Task 4.
- A very long applied value (a 60-character role or actor name) must truncate in its pill and not cause horizontal scroll at 320 px. Pinned in Tasks 2 and 9.

---

### Task 1: Popover primitive and `useMediaQuery`

**Files:**

- Create: `src/components/ui/popover.tsx`, `src/lib/use-media-query.ts`
- Test: `tests/component/popover.test.tsx`, `tests/unit/use-media-query.test.tsx`

**Interfaces:**

- Produces: `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor` (shadcn-style wrappers over `Popover as PopoverPrimitive` from `radix-ui`, `data-slot` attributes, `PopoverContent` classes `bg-popover text-popover-foreground shadow-float ring-1 ring-foreground/10 rounded-md z-50`, props pass through, default `align="start"`, `sideOffset={6}`).
- Produces: `useMediaQuery(query: string): boolean` using `useSyncExternalStore` on `window.matchMedia`; server snapshot `false`.

- [ ] **Step 1: Write failing tests.** `popover.test.tsx`: an open `Popover` renders its content with `role="dialog"`; the content's `className` contains `shadow-float` and no `cursor-`; pressing Escape closes it. `use-media-query.test.tsx`: with `window.matchMedia` stubbed to `matches: true` the hook returns `true`; after the stub's `change` listener fires with `false` it re-renders `false`.
- [ ] **Step 2: Run** `bun x vitest run tests/component/popover.test.tsx tests/unit/use-media-query.test.tsx`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** both files as specified.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** ("Add popover primitive and useMediaQuery").

### Task 2: `FilterBar` core: search, pills, add, clear

**Files:**

- Create: `src/components/filters/filter-bar.tsx`, `src/components/filters/filters.ts` (types and helpers)
- Test: `tests/component/filter-bar.test.tsx`
- Modify: `messages/en.json`, `messages/id.json` (new `filterBar` namespace)

**Interfaces:**

- Produces in `filters.ts`:
  - `type FilterOption = { value: string; label: string }`
  - `type FilterDef = { key: string; label: string } & ({ type: "select"; options: readonly FilterOption[] } | { type: "date"; min?: string; max?: string } | { type: "custom"; renderValue: (value: string) => React.ReactNode; renderEditor: (args: { value: string; onChange: (value: string) => void; onDone: () => void }) => React.ReactNode })`
  - `activeFilters(defs: readonly FilterDef[], values: Readonly<Record<string, string>>): FilterDef[]` (defs whose value is non-empty, in definition order)
  - `inactiveFilters(defs, values): FilterDef[]`
- Produces `FilterBar` props: `{ search?: { value: string; onChange: (v: string) => void; label: string; placeholder?: string }; filters: readonly FilterDef[]; values: Readonly<Record<string, string>>; onChange: (key: string, value: string) => void; onClear: () => void; className?: string }`. Renders a `search` input (`type="search"`, accessible name `search.label`, search icon), then one pill per active filter, then "+ Add filter" (only when an inactive filter exists), then a "Clear filters" button (only when any filter is active).
- Pill: a button named `"{label}: {value text}"` that opens that filter's editor, plus a remove button named `"Remove filter {label}"`. Value text for `select` is the option label, **falling back to the raw value when no option matches**; for `date` it is `format.dateTime(new Date(`${value}T00:00:00`), { dateStyle: "medium" })`; for `custom` it is `renderValue(value)`. The pill text truncates (`max-w-48 truncate`) and carries a `title` with the full text.

- [ ] **Step 1: Write failing tests** in `filter-bar.test.tsx` (render with `NextIntlClientProvider` via the repo's test helper): (a) the search box has the given accessible name and calls `onChange` while typing; (b) a `select` filter with value `r1` and option `{ value: "r1", label: "Sales" }` shows a pill named `Role: Sales`; (c) a value with no matching option (`"gone"`) shows `Role: gone` and its remove button still calls `onChange("role", "")` **(Review Focus 1)**; (d) a 60-character label renders with `truncate` and a `title` equal to the full text **(Review Focus 5)**; (e) "Clear filters" is absent with no active filter and present with one, and calls `onClear`; (f) "+ Add filter" is absent when every filter has a value.
- [ ] **Step 2: Run** `bun x vitest run tests/component/filter-bar.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** `filters.ts` and the `FilterBar` shell (no overlays yet: pills and buttons only), and add the `filterBar` keys (`addFilter`, `clearFilters` = "Clear filters", `remove` = "Remove filter {label}", `editFilter`, `anyValue`) to both locale files.
- [ ] **Step 4: Run** the test and `bun run i18n:check`. Expected: PASS.
- [ ] **Step 5: Commit** ("FilterBar: search, removable pills, clear").

### Task 3: `FilterBar` overlays: add-filter menu and editors

**Files:**

- Modify: `src/components/filters/filter-bar.tsx`
- Create: `src/components/filters/filter-overlay.tsx`
- Modify: `tests/component/filter-bar.test.tsx`

**Interfaces:**

- Consumes: Task 1 `Popover*`, `useMediaQuery`, existing `Sheet*` from `src/components/ui/sheet.tsx` (side `bottom`); Task 2 types.
- Produces `FilterOverlay` props `{ open: boolean; onOpenChange: (open: boolean) => void; trigger: React.ReactNode; title: string; children: React.ReactNode }`: a `Popover` when `useMediaQuery("(min-width: 640px)")` is true, otherwise a bottom `Sheet` with the same children and `title` as its accessible name.
- Behaviour: "+ Add filter" opens the overlay listing the inactive filters; choosing one switches the same overlay to that filter's editor. A pill opens its editor directly. A `select` editor is a list of options (role `option`, the current one `aria-selected`) that sets the value and closes; a `date` editor is an `<input type="date">` labelled with the filter label that sets the value on change; a `custom` editor is `renderEditor`.

- [ ] **Step 1: Write failing tests** (stub `matchMedia` for desktop and mobile): (a) desktop: clicking "+ Add filter" shows a popover listing "Role" and "Status"; choosing "Role" then "Sales" calls `onChange("role", "r1")` and closes; (b) mobile: the same flow renders a `dialog` that is a sheet (`data-slot="sheet-content"`); (c) Escape closes the overlay and focus returns to the "+ Add filter" button **(Review Focus 3)**; (d) clicking the pill `Role: Sales` opens the select editor with `Sales` `aria-selected`; (e) activating a pill's remove button moves focus to the next pill, or to "+ Add filter" when it was the last **(Review Focus 2)**.
- [ ] **Step 2: Run** the file. Expected: FAIL on the new tests.
- [ ] **Step 3: Implement** `FilterOverlay` and wire open state in `FilterBar` (`openKey: "add" | string | null`); manage focus with refs per the behaviours above.
- [ ] **Step 4: Run** the file and `bun run test`. Expected: PASS.
- [ ] **Step 5: Commit** ("FilterBar: add-filter menu and editors in a popover or sheet").

### Task 4: `date` filter constraints and long values

**Files:**

- Modify: `src/components/filters/filter-bar.tsx`
- Modify: `tests/component/filter-bar.test.tsx`

**Interfaces:** `FilterDef` `date` accepts `min`/`max` (already in Task 2); no new exports.

- [ ] **Step 1: Write failing test:** a `from` filter defined with `max: "2026-11-10"` renders its editor input with `max="2026-11-10"`; a `to` filter with `min: "2026-11-01"` renders `min="2026-11-01"` **(Review Focus 4)**; the pill for `from=2026-11-10` reads `From: Nov 10, 2026`.
- [ ] **Step 2: Run.** Expected: FAIL if the editor does not forward `min`/`max`.
- [ ] **Step 3: Forward `min`/`max`** to the date input in the date editor.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** ("FilterBar: date editor honours min and max").

### Task 5: DataTable polish

**Files:**

- Modify: `src/components/data-table/data-table.tsx`
- Modify: `tests/component/data-table.test.tsx`

**Interfaces:**

- Produces on `DataTableColumn<T>`: `rowActions?: boolean` (the cell is hidden until the row is hovered or has focus within, always visible on touch and keyboard focus). Produces on `DataTable` props: `density?: "comfortable" | "compact"` (default `comfortable`; row classes `h-12` and `h-9`).
- Behaviour: header row sticky with a bottom border; sortable headers show a muted `ChevronsUpDown` icon when unsorted (hidden from assistive tech) and keep `aria-sort`; rows use `group/row` and the hover tint `bg-raised`; numeric cells keep `tabular-nums`.

- [ ] **Step 1: Write failing tests:** a `rowActions` column's cell has classes `opacity-0`, `group-hover/row:opacity-100`, `group-focus-within/row:opacity-100` and `pointer-coarse:opacity-100`; `density="compact"` gives rows `h-9`; an unsorted sortable header contains an `aria-hidden` icon and its button name is unchanged; `thead` has `sticky` and `border-b`.
- [ ] **Step 2: Run** `bun x vitest run tests/component/data-table.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** as specified. Existing tests in the file keep passing unchanged.
- [ ] **Step 4: Run** the file and `bun run test`. Expected: PASS.
- [ ] **Step 5: Commit** ("DataTable: sticky header, sort affordance, row actions, density").

### Task 6: Users list on `FilterBar`

**Files:**

- Modify: `src/features/admin-users/user-filters.tsx`, `src/features/admin-users/users-table.tsx`
- Modify: `tests/component/admin-users.test.tsx`, `tests/e2e/mock/admin-users.spec.ts`

**Interfaces:**

- Consumes: Tasks 2 to 5. `UserFilters` keeps its props (`filters`, `search`, `onSearchChange`, `onFilterChange`, `onClear`, `hasFilters`, `roles`) so `users-table.tsx` changes only where the table adopts `rowActions`.
- Behaviour: the membership tabs stay as tabs (a separate pattern: one value, always visible), restyled with the accent underline (`border-brand-accent`). Below them `FilterBar` renders the search ("Search by name or exact email") and two `select` filters: `status` ("Account status", options from `ACCOUNT_STATUSES`) and `role` ("Role", options from `roles`, omitted when `roles` is undefined). The `actions` column sets `rowActions: true`.

- [ ] **Step 1: Update the tests first** so they fail against the old UI: in `admin-users.test.tsx` and `admin-users.spec.ts` replace "combobox Role/Account status" interactions with the new flow (click "+ Add filter", choose "Role", choose "Sales"; assert the pill `Role: Sales` and the URL `?role=…`), keep the search box and "Clear filters" selectors, assert reload keeps the pills, and assert a user without `roles:manage` sees no "Role" in the add-filter list.
- [ ] **Step 2: Run** `bun x vitest run tests/component/admin-users.test.tsx` and `bun x playwright test --project=mock tests/e2e/mock/admin-users.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `UserFilters` on `FilterBar` and set `rowActions` on the actions column.
- [ ] **Step 4: Run** both. Expected: PASS (restart the mock identity first).
- [ ] **Step 5: Commit** ("Users list: filter pills and row actions").

### Task 7: Audit log on `FilterBar`

**Files:**

- Modify: `src/features/audit/audit-filters.tsx`, `src/features/audit/audit-table.tsx`
- Modify: `tests/component/audit.test.tsx`, `tests/e2e/mock/audit.spec.ts`

**Interfaces:**

- Consumes: Tasks 2 to 5 and the feature's own `useActorName`, `useActorSearch`.
- Behaviour: `AuditFilters` keeps its props and builds `FilterDef`s: `actor` (`custom`: `renderValue` renders a small component using `useActorName` to show the name, falling back to the "Someone" string; `renderEditor` is the existing debounced actor search list, which selects a user and calls `onDone`; the filter is omitted when the viewer lacks `USERS_READ`), `action` (`select` from `ACTION_PREFIXES`), `from` (`date`, `max: filters.to`), `to` (`date`, `min: filters.from`).

- [ ] **Step 1: Update the tests first:** replace the combobox, "By" searchbox and `getByLabel("From"/"To")` interactions with the add-filter flow; assert the actor pill shows the actor's name, the date pills read `From: Nov 10, 2026`, "Clear filters" empties the URL, and the `to` editor input has `min` equal to `from`.
- [ ] **Step 2: Run** `bun x vitest run tests/component/audit.test.tsx` and the audit e2e spec. Expected: FAIL.
- [ ] **Step 3: Implement** as specified.
- [ ] **Step 4: Run** both. Expected: PASS.
- [ ] **Step 5: Commit** ("Audit log: filter pills with an actor picker").

### Task 8: Search-only lists share `FilterBar`

**Files:**

- Modify: `src/features/admin-roles/roles-table.tsx`, `src/features/admin-roles/role-templates-table.tsx` (only if it has its own search input), `src/features/notes/notes-table.tsx`, `src/features/tenants/tenants-table.tsx`
- Modify: `tests/component/admin-roles.test.tsx`, `notes.test.tsx`, `tenants.test.tsx`, `role-templates.test.tsx` only where they break

**Interfaces:** Consumes `FilterBar` with `filters: []` and `search` only. Each list passes `search.label` and `placeholder` from its existing translation key and sets `rowActions: true` on its actions column.

- [ ] **Step 1: Write the failing check:** add to each affected component test an assertion that the search box is rendered by the shared bar (`data-slot="filter-bar"` ancestor) and that no inline duplicate `Input type="search"` markup remains; run `bun run lint` to confirm no unused imports after the change.
- [ ] **Step 2: Run** the four component tests. Expected: FAIL on the new assertion.
- [ ] **Step 3: Replace** each inline search `Input` block with `FilterBar`; delete the now-unused imports and icons.
- [ ] **Step 4: Run** `bun run test` and the e2e specs `admin-roles`, `notes`, `tenants`, `role-templates`. Expected: PASS.
- [ ] **Step 5: Commit** ("Roles, notes, tenants: shared search bar").

### Task 9: Docs, screenshots, verification and PR

**Files:**

- Modify: `DESIGN.md` (section 5), `docs/DECISIONS.md`, `tests/e2e/mock/ui-snapshots.spec.ts`

- [ ] **Step 1: Document** in `DESIGN.md` section 5 the table and filter conventions (pills for filters, tabs for a single membership-style value, popover from `sm` and sheet below, row actions revealed on hover or focus and always on touch, "Clear filters" label) and add one `DECISIONS.md` row (filter types limited to `select`/`date`/`custom`; `use-list-params` unchanged; tabs kept for membership; "Clear filters" text kept for test stability).
- [ ] **Step 2: Extend `ui-snapshots.spec.ts`** (opt-in, `UI_SNAPSHOTS=1`) with: Users with `?status=active` applied, Users with the add-filter popover open, Audit with an actor/date pill applied, and the mobile sheet open at 390 px. Capture a **before** set on the PR 1 branch tip into `.ui-review/pr2-before` and an **after** set into `.ui-review/pr2-after`. Look at every image.
- [ ] **Step 3: Verify:** `bun run check`; restart the mock identity, then `bun run e2e:mock` (axe passes in both themes); stop the dev server, `bun run build` and `bun run budget` (stay under 200 KB). Also run `bun run ui:inspect` against Users and Audit at 320 px: no horizontal overflow with a 60-character applied value **(Review Focus 5)**.
- [ ] **Step 4: Open a draft PR** (base `chore/ui-refresh-1-foundation`) titled "UI refresh 2/3: table and filter bar", listing what was and was not verified and the deferred items.

---

## Self-review notes

- **Spec coverage:** `DataTable` sticky header, sortable affordance, row hover, row actions, density, skeleton/empty/error (kept), mobile cards (kept, unchanged) → Task 5. `FilterBar` pills, "+ Add filter", "Clear filters", popover on desktop and sheet on mobile, keyboard behaviour → Tasks 2 to 4. Roll-out to Users, Audit, Roles, Notes, Tenants, Role templates → Tasks 6 to 8. e2e rewrite and docs → Tasks 6, 7, 9.
- **Two judgement calls, for the owner to confirm:** (1) Users' membership tabs (All, Invited, Active, Disabled) stay as tabs rather than becoming a pill, because they are a single always-visible choice; (2) the clear button keeps the text "Clear filters" (not "Clear all") so existing selectors and wording stay stable.
- **Not in this PR:** selected-row state (no list has row selection yet), changing `use-list-params`, the shell (PR 3).
- **Consistency:** `FilterDef`, `FilterOption`, `activeFilters`, `inactiveFilters`, `FilterBar`, `FilterOverlay`, `useMediaQuery`, `rowActions`, `density` are named identically in every task.
