# DESIGN.md

> Project design contract. Replace the example values below with the product's real decisions. Do not treat examples as approved brand choices.

> **Status:** the visual direction is not yet decided. The UI that ships today follows the earlier brief linked in section 4 ("Sources in code"); the owner has said they do not like it, so do not treat it as approved art direction. Agents must not invent the missing decisions: propose a direction, then wait for the owner to record it here.

## 1. Product and audience

- Product: web-starter, a reusable white-label Next.js admin starter for client projects: sign-in, account, users, roles with a permission matrix, audit log, tenants. Rebranded per client from one config file and CSS tokens.
- Primary users:
- Primary user problem:
- Most important user task:
- Brand attributes (3–5): e.g. calm, precise, playful, trustworthy
- What this product should NOT feel like:

## 2. Art direction

Describe the intended visual identity in a few sentences.

- Overall direction: Stripe-like polish with a restrained palette: mostly neutral, colour used sparingly. (Owner input; details below are proposals until the owner confirms.)
- Reference products or screenshots: Stripe (owner's stated favourite). Screenshots still to be added.
- What to borrow from each reference: Stripe: precise typography and type scale, generous but purposeful spacing, clear information hierarchy, crisp data tables and forms, subtle and fast interaction feedback. (Proposed.)
- What not to copy: Stripe's multi-colour gradients and bright accent palette (owner: "not too colorful"), its brand wordmark and illustration style. (Proposed.)
- Distinctive product-specific visual motif, if any:

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

| Role       | Token / value | Usage                      |
| ---------- | ------------- | -------------------------- |
| Primary    | TBD           | Main brand/action          |
| Accent     | TBD           | Limited emphasis           |
| Background | TBD           | Main canvas                |
| Surface    | TBD           | Raised/content surfaces    |
| Text       | TBD           | Primary content            |
| Muted text | TBD           | Secondary content          |
| Border     | TBD           | Separation where needed    |
| Success    | TBD           | Positive status            |
| Warning    | TBD           | Caution                    |
| Danger     | TBD           | Errors/destructive actions |
| Focus      | TBD           | Keyboard focus             |

Rules:

- Prefer semantic tokens over hard-coded colors.
- Do not introduce gradients as a default decoration.
- Check contrast for text, icons, borders, and focus indicators.
- Never rely on color alone to communicate status.

### Spacing, shape, and elevation

- Spacing scale: TBD
- Corner radius scale: TBD
- Shadow/elevation scale: TBD
- Content max-width: TBD
- Grid/breakpoints: TBD

Rules:

- Use the existing spacing and radius tokens.
- Avoid stacking multiple bordered or shadowed containers.
- Use elevation only when it clarifies layering.

## 5. Layout and components

- Navigation pattern:
- Page shell:
- Content width:
- Responsive navigation behavior:
- Form conventions:
- Table/list conventions:
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
