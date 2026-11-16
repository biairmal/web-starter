# DESIGN.md

> Project design contract. Replace the example values below with the product's real decisions. Do not treat examples as approved brand choices.

> **Status:** the colour and interaction direction was approved on 2026-11-16 (see `docs/superpowers/specs/2026-11-16-ui-refresh-design.md`). Typography, spacing and the table, filter and shell patterns are still being redesigned in PRs 2 and 3: leave their rows as TBD until those land. Agents must not invent missing decisions: propose, then wait for the owner to record them here.

## 1. Product and audience

- Product: web-starter, a reusable white-label Next.js admin starter for client projects: sign-in, account, users, roles with a permission matrix, audit log, tenants. Rebranded per client from one config file and CSS tokens.
- Primary users:
- Primary user problem:
- Most important user task:
- Brand attributes (3–5): e.g. calm, precise, playful, trustworthy
- What this product should NOT feel like: gloomy, unpolished, or too colourful (owner's words: it should have "some accent colour" so it does not feel gloomy, but "not too colorful").

## 2. Art direction

Describe the intended visual identity in a few sentences.

- Overall direction: Stripe-like polish with a restrained palette. A soft blue-grey ground, a white sheet with a hairline border, and one indigo accent used only on things you can act on (primary button, active nav, selected filter, links, focus ring). Status colours (green, amber, red) are kept for status only. Approved 2026-11-16 ("direction A, tinted ground, indigo accent").
- Reference products or screenshots: Stripe (owner's stated favourite). Screenshots still to be added.
- What to borrow from each reference: Stripe: precise typography and type scale, purposeful spacing, clear information hierarchy, crisp data tables and forms, subtle and fast interaction feedback.
- What not to copy: Stripe's multi-colour gradients and bright accent palette (owner: "not too colorful"), its brand wordmark and illustration style.
- Distinctive product-specific visual motif, if any: none. Distinctiveness comes from restraint and finish, not decoration.

References are evidence and inspiration, not instructions to clone another product.

## 3. Design principles

1. **Clarity before decoration.** Every visual element should support comprehension, navigation, feedback, or brand expression.
2. **Hierarchy before density.** Make the most important information and action obvious.
3. **Consistency without monotony.** Reuse shared patterns, but choose layouts that fit the content.
4. **Quiet confidence.** Avoid unnecessary gradients, shadows, borders, badges, and animation.
5. **Accessible by default.** Design for keyboard, assistive technology, contrast, zoom, and reduced motion.
6. **Responsive by design.** Preserve task priority and usability at every viewport.

## 4. Foundations

Fill these from the actual product design system. If a token already exists in code, link to its source rather than duplicating it here.

### Sources in code

- Tokens (colour, type, spacing, radius): `src/app/tokens.css`
- Tailwind / shadcn mapping: `src/app/globals.css`
- Brand config (name, logo, nav): `src/config/brand.ts`
- Primitive components: `src/components/ui/`
- Earlier brief the current tokens came from: `../project-files/phase2/frontend/DESIGN_BRIEF.md`
- Earlier generated direction ("framed sheet"): `../.taste-skill/direction.json`

Project rules that apply to every visual decision (see `AGENTS.md`): tokens only and no hex colours in components, all text through `next-intl`, no new feature-to-feature imports.

### Typography

| Role          | Token / value | Notes                     |
| ------------- | ------------- | ------------------------- |
| Display       | TBD           | Use sparingly             |
| Page title    | TBD           |                           |
| Section title | TBD           |                           |
| Body          | TBD           | Prioritize readability    |
| Secondary     | TBD           | Must remain legible       |
| Label         | TBD           | Forms and metadata        |
| Monospace     | TBD           | Code and technical values |

Rules:

- Use a small, intentional type scale.
- Keep line lengths comfortable for reading.
- Do not use low-contrast or tiny text for important information.
- Use weight and size consistently to express hierarchy.

### Color

Values live in `src/app/tokens.css` (light `:root`, dark `:root[data-theme="dark"]`); this table names the tokens and their role.

| Role       | Token                                   | Usage                                                    |
| ---------- | --------------------------------------- | -------------------------------------------------------- |
| Primary    | `--primary` (= `--brand-accent`)        | The one filled action per screen; label `--primary-ink`  |
| Accent     | `--brand-accent`, `--brand-accent-dark` | Links, focus ring, active nav marker, chart-1            |
| Hover      | `--primary-hover`, `--primary-press`    | Derived from the accent with `color-mix`; never hand-set |
| Selection  | `--active`                              | Accent tint: active nav, selected row, selected filter   |
| Background | `--frame`                               | The tinted ground behind the sheet                       |
| Surface    | `--surface`, `--raised`                 | The white sheet and cards; a well inside a card          |
| Text       | `--text`                                | Primary content                                          |
| Muted text | `--muted`, `--faint`                    | Secondary content; both keep 4.5:1                       |
| Border     | `--border`, `--rule`, `--control`       | Hairlines, row rules, input borders                      |
| Success    | `--positive`, `--pill-positive-*`       | Positive status                                          |
| Warning    | `--warning`, `--pill-warning-*`         | Caution                                                  |
| Danger     | `--negative`, `--pill-negative-*`       | Errors and destructive actions                           |
| Focus      | `--ring` (= `--brand-accent`)           | Keyboard focus                                           |

#### Rebranding the accent

A client changes `--brand-accent` (light) and `--brand-accent-dark` (dark) in `tokens.css`. Hover, pressed and selected tints follow automatically. If the new accent is light (yellow, light green), also set `--primary-ink` to a dark colour, because the white button label will not be readable. Then run `bun x vitest run tests/unit/tokens-contrast.test.ts`: it checks text, accent, label and status pairs at 4.5:1 in both themes and fails if the new colours do not.

Rules:

- Prefer semantic tokens over hard-coded colors.
- Do not introduce gradients as a default decoration.
- Check contrast for text, icons, borders, and focus indicators.
- Never rely on color alone to communicate status.

### Spacing, shape, and elevation

- Spacing scale: the tokens in `tokens.css`: `--gap` and `--pad` 24px, `--card-pad` 20px, `--section-gap` 32px; row heights 48px (72px for two-line rows), nav row 34px, control 32px, field 40px.
- Corner radius scale: chip 4px, control 6px, card 8px, sheet 16px.
- Shadow/elevation scale: none at rest; only floating surfaces (menu, popover, dialog, sheet, toast) use `shadow-float`, always with a hairline ring.
- Content max-width: `screen-xl` (1280px).
- Grid/breakpoints: `sm` 640px (the sheet is inset, tables replace cards) and `lg` 1024px (the sidebar replaces the drawer).

Rules:

- Use the existing spacing and radius tokens.
- Avoid stacking multiple bordered or shadowed containers.
- Use elevation only when it clarifies layering.

## 5. Layout and components

- Navigation pattern: a 228px sidebar from 1024px up: the logo, the tenant switcher (only with several tenants), grouped links with the current one marked by a 2px accent bar, a tinted row and an accent icon, and the user menu at the bottom.
- Page shell: the sidebar and top bar sit on the tinted frame; the content is a white sheet with a hairline border, 16px corners and an 8px inset from the window (from 640px). Below 640px the sheet is the screen, with no inset and no corners.
- Page header: every list and account page starts with `PageHeader`: one `h1`, a sentence under it, and the page's primary action at the end; it wraps on narrow screens. Detail screens keep their own headers (back link, status).
- Content width: the content column is at most `screen-xl` (1280px).
- Responsive navigation behavior: below 1024px the sidebar becomes a drawer from the start edge, opened from a 48px top bar that holds the menu button and the logo; following a link closes it.
- Sign-in and other public screens: one white card (hairline border, no shadow) holding the logo and the form, in a 400px column on the tinted frame, with the support and legal footer below it.
- Logo: `public/brand/logo.svg` and `logo-dark.svg` (shown by theme) and `mark.svg`, with explicit colours because an SVG in an `<img>` cannot use `currentColor`. A client replaces the three files.
- Form conventions:
- Table/list conventions: every list uses `DataTable` (server-paged, sorted and filtered through the URL) with a `FilterBar` above it. Filters are removable pills beside the search box; "Add filter" lists the ones not yet applied, and "Clear filters" resets all of them and the search. A filter that is always visible and has a few exclusive values (a status, a membership) is `FilterTabs` instead, underlined in the accent. The header stays in view while the page scrolls; sortable headers show an arrow (a faint double arrow when unsorted). A row's actions menu appears on hover or focus and is always visible on touch. Rows are comfortable (48px) by default, compact (36px) on request. Below 640px a table becomes a two-line card list.
- Filter editors: a popover from 640px up and a bottom sheet below, the same on every list. Filter types are `select`, `date` and `custom` (a feature's own picker, such as the audit log's person search); each holds one string in the URL.
- Dialog/drawer conventions:
- Empty-state conventions:
- Toast/notification conventions:

Component rules:

- Reuse shared components when their semantics and behavior fit.
- Do not create a new component solely to avoid a small amount of duplication.
- Keep component APIs focused.
- Document meaningful variants and states.
- Avoid one-off styling that conflicts with the design system.

## 6. Interaction and motion

For each interactive component, define applicable states:

- Default
- Hover
- Focus-visible
- Pressed/active
- Disabled
- Loading
- Success
- Error

How the shared components behave:

- Cursors come from one base rule in `globals.css`: a pointer on everything clickable (buttons, links with `href`, menu items, tabs, options, switches), `not-allowed` on disabled controls. Components never set `cursor-*` themselves.
- Buttons: the primary fill darkens on hover (`--primary-hover`) and again when pressed (`--primary-press`, with a 120 ms scale to 0.97). The pending state is `SubmitButton` (spinner, `aria-busy`, stable width), not a prop on `Button`.
- Inputs and selects: a darker border on hover, the accent ring on focus-visible, red ring when invalid.
- Floating surfaces (menu, popover, dialog, sheet, toast) use `shadow-float` and a hairline ring; nothing else has a shadow.

Motion rules:

- Motion must explain a state change, relationship, or spatial transition.
- Keep feedback immediate and purposeful.
- Respect `prefers-reduced-motion`.
- Avoid animation that blocks task completion.
- Use consistent duration and easing tokens.

## 7. Responsive behavior

Define and test the project's actual breakpoints. Do not assume a desktop layout will work when compressed.

At minimum, verify:

- Narrow mobile: approximately 320–375 CSS px
- Typical mobile: approximately 390–430 CSS px
- Tablet: approximately 768–1024 CSS px
- Desktop: approximately 1280 CSS px and above

Check navigation, content order, touch targets, tables, dialogs, forms, and long text.

## 8. Accessibility baseline

- Semantic landmarks and heading order.
- Programmatic labels for form controls.
- Keyboard-operable interactions.
- Visible focus indicators.
- Appropriate accessible names for icon-only controls.
- Sufficient text and non-text contrast.
- Errors explained in text and associated with fields.
- No information conveyed by color alone.
- Reduced-motion support.
- Sensible focus management for dialogs and menus.

## 9. Anti-patterns to challenge

Before accepting a design, ask:

- Does this look like a generic template that could belong to any product?
- Are cards being used because the content needs them, or because AI defaults to cards?
- Is the visual hierarchy obvious in a quick glance?
- Are there too many competing accents?
- Is the page over-decorated relative to its purpose?
- Does the interface still work with real, long, empty, and error-state content?
- Does every control have a clear purpose and meaningful feedback?

Avoid these defaults unless the product's brand and use case justify them:

- Generic purple/blue gradients, glowing blobs, and gratuitous glassmorphism.
- The same font, card layout, hero composition, and rounded-pill buttons for every product.
- Excessive cards, nested panels, borders, shadows, badges, and decorative icons.
- Oversized headings or empty whitespace that hides a lack of content.
- Centering every section when the content calls for a different composition.
- Decorative animation that delays, distracts from, or obscures the task.
- Fake functionality, dead controls, placeholder links, and interactions with no feedback.
- Invented testimonials, metrics, customer logos, or product claims.

Do not add visual novelty just to appear distinctive. Make the interface specific to its product, content, and users.

## 10. Decisions log

Record durable design decisions here so future contributors and agents do not unknowingly reverse them.

| Date       | Decision | Reason | Owner |
| ---------- | -------- | ------ | ----- |
| YYYY-MM-DD | TBD      | TBD    | TBD   |
