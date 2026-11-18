# Contributing

How a change gets from an idea to `main`. It applies to everyone, human or AI agent. How the code itself is written
(conventions, feature boundaries, UI rules) is in [AGENTS.md](AGENTS.md), and it binds humans too.

## Before you start

1. Get the app running with the [README quick start](README.md#quick-start).
2. Read [AGENTS.md](AGENTS.md) for the code rules, and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the app
   fits together. For any change a user can see, also read [DESIGN.md](DESIGN.md) and
   [UI_REVIEW_WORKFLOW.md](UI_REVIEW_WORKFLOW.md).
3. Find the spec. Tasks come from the workspace's `phase2/frontend/IMPLEMENTATION_PLAN.md`, the behaviour from
   `TRD.md`, the requirements from `PRD.md`, and the flows from `APP_FLOW.md`. Read the task's "Read first" list,
   then the code it touches.
4. **When the TRD is unclear:** choose the simplest option consistent with it, implement it, and add one line to
   [docs/DECISIONS.md](docs/DECISIONS.md) (`date · task · decision · reason`). Do not stop and wait.

## Scope of a change

- **One task = one branch = one pull request.**
- **Do only what the task says.** Anything outside its "Files" list or "Out of scope" goes in a follow-up note in the
  PR description, not in the code.
- **Never** weaken a rule from TRD 11 (security) to make a test pass.

## Git conventions

`.github/workflows/pr-conventions.yml` checks these on every PR. PRs are squash-merged, so the PR title becomes the
commit on `main`.

- **Branch:** `<type>/<group>/<task-id>-<slug>`. `<group>` is optional and names the work stream, so parallel streams
  don't collide. The task ID keeps the plan's casing. Examples: `feat/fe/F8.11-upload`,
  `chore/ui-refresh/2-table-filters`.
- **Commit and PR title:** [Conventional Commits](https://www.conventionalcommits.org/),
  `<type>(<scope>)?: <what it does, lower case>`, plus ` (<task id>)` on the PR title. Types:
  `feat fix refactor perf test docs build ci chore revert`. A breaking change adds `!` and a `BREAKING CHANGE:`
  footer. The commit body says why, not how.
- **PR body:** fill in [.github/pull_request_template.md](.github/pull_request_template.md). `### Why` (requirement,
  bug, security, or refactor, with its source), `### What changed` and `### Verification` are required. Verification
  quotes each command's real output from the final pushed head, keeps failed or skipped checks in the table, and
  lists what was not verified. UI changes also fill in Design intent and screenshot Evidence.

## Definition of Done

- [ ] All of the task's "Acceptance" items pass.
- [ ] `bun run check` is green (lint, type check, format check, API types check, i18n key check, unit and component
      tests).
- [ ] `bun run e2e:mock` is green if the change adds or changes a screen.
- [ ] New screens have axe checks with no critical violations.
- [ ] UI changes were checked in a real browser as [UI_REVIEW_WORKFLOW.md](UI_REVIEW_WORKFLOW.md) describes.
- [ ] The task's row in the **Status** table of `IMPLEMENTATION_PLAN.md` is set to ✅ in the same PR.
- [ ] The README, `.env.example`, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [SECURITY.md](SECURITY.md) match
      the change when it touches setup, config, commands, the BFF or the session.
