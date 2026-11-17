<!--
Title (becomes the squash commit on main): <type>(<scope>)?: <what it does, lower case> (<task id>)
  e.g. feat(upload): file upload with dropzone, progress and retry (F8.11)
Branch: <type>/<group>/<task-id>-<slug>, e.g. feat/fe/F8.11-upload
Keep sections in this order. Delete a section only when it has nothing to say; never write "N/A".
Write facts in present tense with exact names (components, props, tokens, i18n keys). Delete these comments.
-->

## <Task ID> <Task name>

<One or two sentences: what the user can now see or do.>

**Base:** `main` (<short sha>)
<!-- or: **Stacked on** #<n> (`<branch>`): merge that first, then retarget this PR to `main`. -->

**Risk:** low | medium | high, because <one line>
**Start reviewing at:** `<file>`, because <why that file first>

### Why

**Kind:** requirement | bug fix | security / dependency | refactor / tech debt | tooling / docs

<!-- Answer the prompt for the kind you picked, delete the others. -->

- Requirement: the task and spec it answers (`IMPLEMENTATION_PLAN F8.11`, `TRD 7.2`, `PRD US-12`, `APP_FLOW 4`) and the user need in one line.
- Bug fix: the symptom someone saw (screen, viewport, steps to reproduce) and the root cause.
- Security / dependency: the advisory or version and what is exposed without the change.
- Refactor / tooling / docs: what was hard or wrong before, and what this unblocks.

### What changed

- **<Component or screen>** in `src/...`: the behaviour, props, states.
- Routes, BFF handlers, query keys, i18n keys and tokens added or changed.

### Design intent

<!-- UI changes only (see UI_REVIEW_WORKFLOW.md). -->

- Hierarchy and visual direction; existing tokens and components reused.
- Any departure from `DESIGN.md`, and why. New tokens named.

### Verification

<!--
Quote what each command printed on the last run of the pushed head (after any rebase), never "tests pass".
Keep a failed or skipped check in the table with its result. Delete rows that do not apply; add any you ran.
-->

| Check                                                             | Command / tool             | Result                                                                        |
| ----------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------- |
| Lint, types, format, API types, i18n keys, unit + component tests | `bun run check`            | exit 0, `<n> passed`                                                          |
| Production build                                                  | `bun run build`            | exit 0                                                                        |
| Sign-in JS budget                                                 | `bun run budget`           | `<n> KB` of 200 KB                                                            |
| Mock e2e + axe                                                    | `bun run e2e:mock`         | `<n> passed, <n> skipped`, 0 critical axe violations                          |
| Browser: viewports                                                | `bun run ui:inspect <url>` | 1440 / 768 / 390 / 320 px; light + dark; no overflow; Tab order               |
| Browser: interactions                                             | <tool>                     | <what was clicked, typed, tabbed through; states seen: loading, empty, error> |
| Console                                                           | <tool>                     | 0 errors                                                                      |
| CI on the pushed head                                             | `gh pr checks`             | <each check and its state>                                                    |

**Not verified:** <viewports, states, browsers or flows not checked and why, or "nothing">

### Evidence

<!-- UI changes only: screenshots or a short recording, before and after, at desktop and mobile width. -->

|         | Before | After |
| ------- | ------ | ----- |
| Desktop |        |       |
| Mobile  |        |       |

### Acceptance → evidence

| Criterion (from the plan)          | Proven by                                           |
| ---------------------------------- | --------------------------------------------------- |
| <one row per acceptance criterion> | `file.test.tsx > test name` / e2e spec / screenshot |

### Judgement calls

<!-- Every choice the plan, TRD or DESIGN.md did not settle, also recorded in docs/DECISIONS.md, so a reviewer can overrule it cheaply. -->

-

### Not covered / follow-ups

-
