# UI_REVIEW_WORKFLOW.md

## Purpose

A repeatable team workflow for producing polished, distinctive, accessible UI without slowing engineering down or relying on subjective "looks good" approvals.

## Roles

- **Feature author:** implements the UI and performs the first visual pass.
- **Reviewer:** checks product fit, consistency, behavior, and maintainability.
- **Design owner (if available):** resolves art-direction or system-level decisions.

One person may hold multiple roles on a small team.

## Precedence

When sources disagree, the higher one wins:

1. Product requirements (what the screen must accomplish) and the rules in `AGENTS.md` (tokens only, `next-intl`, no hex colours, feature boundaries).
2. `DESIGN.md` (the visual identity).
3. Skill advice, in this order: Frontend Design, Impeccable, Emil Kowalski skills, Web Interface Guidelines, UI UX Pro Max. Taste Skill is used only when stronger art direction is wanted.

A skill that suggests a hex colour, a string literal in JSX, or a one-off style is giving advice that conflicts with level 1: translate it into tokens and `t("…")`, do not apply it literally.

Skills are optional tooling. This workflow works without them; the phases below say what to do, and the skill table says who can help.

## Which reviewer for which change

Do not run every reviewer on every change. Pick by scope:

| Change                                              | Run                                                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Copy, spacing or colour tweak using existing tokens | Browser check only (Phase C)                                                                     |
| New or reworked component or screen                 | Frontend Design (direction), then Impeccable critique, then Web Interface Guidelines             |
| Visual identity or shared foundation change         | Frontend Design, Taste Skill if needed, UI UX Pro Max for references; owner approves before code |
| Motion, transitions, hover/press feedback           | Emil Kowalski skills                                                                             |
| Dense data, long text, empty or error states        | `break-ui` (Emil Kowalski)                                                                       |
| Accessibility or release audit                      | Web Interface Guidelines plus axe (`bun run e2e:mock`)                                           |

## Workflow by phase

### Phase A — Before coding

1. Read `AGENTS.md`, `DESIGN.md`, the relevant PRD, and existing components.
2. Identify the primary user task and the key screen states.
3. Capture the current screen (`bun run ui:inspect`, see Phase C) or locate relevant design references.
4. Write a short design brief:
   - User and task
   - Information hierarchy
   - Proposed layout
   - Visual direction
   - Responsive behavior
   - Important interaction states
5. If the work changes shared design foundations, agree on the change before implementation.
6. If `DESIGN.md` is silent on a decision the brief needs (art direction, type, palette), propose it and wait for the owner. Do not decide it silently.

### Phase B — Implementation

1. Reuse existing tokens and components.
2. Implement semantic structure and real interaction behavior.
3. Include loading, empty, error, success, and disabled states where relevant.
4. Avoid placeholder content that misrepresents the final product.
5. Keep the diff focused; do not redesign unrelated screens.

### Phase C — Browser review

Inspect the actual running application, not only a mockup or source code.

Minimum viewport checks:

- Mobile: 390 × 844 (or equivalent narrow viewport)
- Desktop: 1440 × 900 (or equivalent wide viewport)

Also test a narrower width when the layout contains tables, navigation, sidebars, or dense content.

Tooling (the repo already has Playwright, its Chromium, and axe):

| Need                                                                                                                 | Command                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Screenshots at 1440×900, 768×1024, 390×844 and 320×640, plus horizontal-overflow, console-error and Tab-order report | `bun run ui:inspect <url-or-path>...` (writes to `.ui-review/`, git-ignored)                                       |
| Interaction, keyboard and axe checks as tests                                                                        | `bun run e2e:mock` (add a spec under `tests/e2e/mock`)                                                             |
| Pattern scan of source or a running page                                                                             | `npx impeccable detect src/` or `npx impeccable detect http://localhost:3000` (needs the Impeccable CLI; optional) |

Start the app first (`bun run dev`, with the mock stack from `bun run e2e:mock` if the screen needs a session). Look at the screenshots; the script reports facts, it does not judge hierarchy. Only say "inspected in a browser" when one of these actually ran, and name which one.

Review checklist:

- First-glance hierarchy is clear.
- Content width and alignment feel intentional.
- Typography and spacing are consistent.
- No accidental horizontal scrolling or clipped content.
- Long labels and realistic data do not break the layout.
- Buttons, links, forms, menus, dialogs, and navigation work.
- Hover, focus, pressed, disabled, loading, empty, and error states are correct where applicable.
- Keyboard navigation works and focus is visible.
- Reduced-motion preference is respected.
- No console errors or obvious layout shifts.

### Phase D — Design critique

Use available skills as focused reviewers, not as competing sources of truth:

| Reviewer                 | Invoke                                                                                       | Ask it to inspect                                                                               |
| ------------------------ | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Frontend Design          | `/frontend-design`                                                                           | Is the art direction coherent and appropriate for this product?                                 |
| Impeccable               | `/impeccable critique <target>`, `/impeccable polish <target>`, `/impeccable audit <target>` | What looks generic, weak, inconsistent, or insufficiently polished?                             |
| Taste Skill (optional)   | `/design-taste-frontend`                                                                     | Is the visual identity distinctive without becoming arbitrary?                                  |
| Emil Kowalski skills     | `/emil-design-eng`, `/animate`, `/review-animations`, `/animation-performance`, `/break-ui`  | Are motion and interaction feedback purposeful and well-timed? Does it survive worst-case data? |
| Web Interface Guidelines | `/web-design-guidelines <file-or-glob>`                                                      | Are accessibility, semantics, responsiveness, and interaction details sound?                    |
| UI UX Pro Max (optional) | `/ui-ux-pro-max`                                                                             | Are the design-system choices and patterns appropriate?                                         |

Do not run every reviewer on every tiny change. Choose the reviewer that matches the risk and scope (see "Which reviewer for which change").

Cautions:

- **Impeccable `init` and `document` write `PRODUCT.md` and `DESIGN.md`.** `DESIGN.md` here is the team's contract: never let a skill overwrite it. Have the skill write to a scratch file, then merge by hand. Use `PRODUCT.md` only if the owner agrees to add it.
- **Taste Skill is built for marketing sites.** It can arm a finish gate (`.taste-skill/build.json`, enforced by a Stop hook) that applies landing-page rules such as one section per screen and a hero entrance. For app screens, use it for direction only: do not run its `start.mjs` or `gate.mjs`. If a gate is armed by mistake, close it with `gate.mjs --done "<reason>"`.
- **Web Interface Guidelines fetches its rules from GitHub at run time.** It needs network access.
- **UI UX Pro Max's search script needs Python 3.** Without it the skill still gives written guidance but cannot query its style, palette and font data.

Ask for prioritized findings:

- P0: blocks task completion, accessibility, or correctness.
- P1: materially harms usability or visual hierarchy.
- P2: polish issue with noticeable impact.
- P3: subjective or low-impact refinement.

Fix P0 and P1 before merging. Fix P2 when proportionate to the change. Do not spend time on P3 unless it supports the product direction.

### Phase E — Final verification

1. Re-run the relevant tests, lint, and type checks (`bun run check`).
2. Revisit the browser after fixes (re-run `bun run ui:inspect` and compare against the first pass).
3. Compare the final screen against the design brief and `DESIGN.md`.
4. Record any known limitations.
5. Include evidence in the pull request: screenshots or a short recording for meaningful visual changes.

## Final report for UI tasks

1. What changed.
2. The design decisions made, and why.
3. Which viewports and interactions were checked, and with which tool.
4. Checks run and their results.
5. Known limitations and anything not verified.

Never claim browser verification or passing tests that did not happen.

## Pull request template

### UI change

- What user problem does this solve?
- Which screens/components changed?

### Design intent

- What is the intended hierarchy and visual direction?
- Which existing tokens/components were reused?
- Were any design-system decisions changed?

### Verification

- [ ] Browser inspected at mobile width
- [ ] Browser inspected at desktop width
- [ ] Main interactions tested
- [ ] Keyboard and focus states checked
- [ ] Loading/empty/error states checked where relevant
- [ ] Accessibility review completed
- [ ] Tests/lint/type checks completed

### Evidence

- Before:
- After:
- Notes:

### Known limitations

- None / list remaining issues

## Definition of done

A UI pull request is ready when:

- It solves the stated user task.
- It follows `DESIGN.md` or explains an intentional deviation.
- It has been inspected in a real browser at mobile and desktop sizes.
- Important interaction and accessibility states work.
- No P0/P1 issues remain.
- Relevant automated checks pass, or failures are clearly explained.
- The PR includes enough evidence for a reviewer to assess the visual result.
